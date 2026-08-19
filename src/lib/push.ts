import { supabase } from "./supabaseClient";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as
  | string
  | undefined;

/** base64url文字列(VAPID公開鍵)をpushManager.subscribeが要求するUint8Arrayに変換する */
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * この環境（ブラウザ）が Web Push に対応しているかどうか。
 * iOSの場合、対応OSバージョンであっても「ホーム画面に追加」していない
 * Safariタブ上では ServiceWorkerContainer.register 自体は可能でも
 * PushManager.subscribe が失敗する（iOSの仕様）。
 */
export const isPushSupported = (): boolean =>
  getPushUnsupportedReason() === null;

/**
 * isPushSupported() が false になる場合、具体的にどの条件で弾かれたのかを返す。
 * デバッグ用。特に VAPID公開鍵が未設定（.envの設定漏れ・ビルド未反映）は
 * コンソールにも画面にも何のエラーも出ずに「何も起きない」ように見えるため、
 * 原因切り分けの最有力候補として明示的にチェックする。
 */
export const getPushUnsupportedReason = (): string | null => {
  if (typeof window === "undefined") return "window is undefined";
  if (!("serviceWorker" in navigator)) {
    return "このブラウザはService Workerに対応していません";
  }
  if (!("PushManager" in window)) {
    return "このブラウザはPushManagerに対応していません（iOSの場合、ホーム画面に追加してから起動しているか確認してください）";
  }
  if (!VAPID_PUBLIC_KEY) {
    return "VITE_VAPID_PUBLIC_KEYが設定されていません（環境変数の設定漏れ、またはビルドに反映されていません）";
  }
  return null;
};

/**
 * iOSでPWAとして（ホーム画面から）起動されているかどうかの簡易判定。
 * Web Pushが機能する前提条件のひとつなので、ユーザーへの案内分岐に使う。
 */
export const isRunningAsStandalonePwa = (): boolean => {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    nav.standalone === true
  );
};

let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null =
  null;

/** Service Worker を登録する（すでに登録済みなら既存の登録を再利用する） */
export const registerServiceWorker =
  (): Promise<ServiceWorkerRegistration | null> => {
    if (!("serviceWorker" in navigator)) return Promise.resolve(null);

    if (!swRegistrationPromise) {
      swRegistrationPromise = navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => {
          console.error("Service Worker registration failed:", err);
          swRegistrationPromise = null;
          return null;
        });
    }
    return swRegistrationPromise;
  };

/**
 * push購読を作成（未購読の場合のみ）し、Supabaseの push_subscriptions に保存する。
 * 既に同じ端末で購読済みなら、そのendpointをupsertするだけで良い
 * （複数回呼んでも安全＝冪等）。
 *
 * 呼び出し前提: Notification.permission === "granted"
 *
 * ---
 * 【複数アカウント/複数端末についての設計メモ】
 * push購読（endpoint）はブラウザのService Worker登録1つにつき1つしか
 * 持てない（同じapplicationServerKeyで複数回subscribe()しても、
 * ブラウザは同じ既存のendpointを返す）。つまり、同じ端末・同じPWA
 * インストール上で複数アカウントを同時に「切り替えて」ログインした場合、
 * その端末が受け取れるpushは常に「直近でensurePushSubscriptionを
 * 呼んだアカウント」1件分だけになる。
 *
 * これはネイティブのInstagramアプリ（アカウントごとに個別のpushトークンを
 * 登録でき、切り替えなくても複数アカウント分のpushを同時受信できる）とは
 * 異なる挙動だが、Web Pushの仕様上の制約であり、このアプリに限った話ではない。
 * 代わりに、Facebook Messengerの「共有端末での複数アカウント」機能に近い、
 * 「その端末は常に直近ログインしたアカウント宛のpushだけを受け取る」
 * という挙動を採用している（onConflict: "endpoint" による上書き＝
 * 一種の「その端末の受信先をこのアカウントに切り替える」操作）。
 *
 * 1つの端末で複数アカウント分のpushを同時に受け取りたい場合は、
 * ブラウザを分ける／PWAを複数アイコンでインストールする、といった
 * 端末側の対応が必要（endpointがインストールごとに別になるため）。
 *
 * ログアウト時に removePushSubscription() を呼ぶことで、
 * 「ログアウトしたのに他人のこの端末にそのアカウント宛の通知が
 * 届き続ける」事故を防いでいる（useAuth.ts の signOut 参照）。
 */
export const ensurePushSubscription = async (
  // 【原因②対応の余波】保存先のuser_idはRPC内でauth.uid()から決めるため
  // 実際には未使用だが、呼び出し元(usePushSubscription.ts)との互換性のため
  // シグネチャは維持している。呼び出し元のuserIdと実際のセッション(auth.uid())が
  // 万一ズレていても、常に「今ログイン中の本人」で登録される安全側の挙動になる。
  userId: string,
  pairId: string,
): Promise<{ error: string | null }> => {
  void userId;
  if (!isPushSupported()) return { error: "push not supported" };
  if (Notification.permission !== "granted") {
    return { error: "permission not granted" };
  }

  try {
    const registration = await registerServiceWorker();
    if (!registration) return { error: "service worker unavailable" };

    // activate待ち（インストール直後の初回は ready を待つ必要がある）
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true, // Web Pushの仕様上、常にtrue（サイレントpush不可）
        applicationServerKey: urlBase64ToUint8Array(
          VAPID_PUBLIC_KEY!,
        ) as BufferSource,
      });
    }

    const json = subscription.toJSON();
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;
    if (!subscription.endpoint || !p256dh || !auth) {
      return { error: "invalid subscription" };
    }

    // 【原因②対応】従来はここで
    //   supabase.from("push_subscriptions").upsert(..., { onConflict: "endpoint" })
    // をクライアントから直接呼んでいたが、既存行(前の所有者)へのUPDATEになった際、
    // RLSの USING (auth.uid() = user_id) が「更新前の既存行のuser_id」に対して
    // 評価されるため、別アカウントへの引き継ぎ時にRLS違反で拒否されていた。
    // 所有者に関わらずendpoint行をreassignできるSECURITY DEFINERなRPCを経由する。
    const { error } = await supabase.rpc("claim_push_subscription", {
      p_endpoint: subscription.endpoint,
      p_p256dh: p256dh,
      p_auth_key: auth,
      p_pair_id: pairId,
      p_user_agent: navigator.userAgent,
    });

    return { error: error?.message ?? null };
  } catch (err) {
    console.error("ensurePushSubscription failed:", err);
    return {
      error: err instanceof Error ? err.message : "unknown push error",
    };
  }
};

/**
 * この端末のpush購読を解除し、DB上のレコードも削除する（ログアウト時などに使用）。
 *
 * 【原因①対応】以前は navigator.serviceWorker.getRegistration()（その場で
 * 「現在ページを制御しているSW」を問い合わせる方式）を使っていたが、
 * iOS/iPadOS SafariのPWAはSWがページの制御を確立するタイミングが
 * Chrome(Windows)と比べて不安定・遅延しやすく、その結果 registration や
 * subscription が undefined/null になり、unsubscribe()もDBのdelete()も
 * 一度も呼ばれないまま関数が無言で終了してしまうことがあった
 * （例外も出ないため、コンソールにも画面にも手がかりが残らない）。
 *
 * ensurePushSubscription()と同じ取得経路
 * （registerServiceWorker()のキャッシュ済みPromiseを再利用し、
 *  navigator.serviceWorker.readyでactivateを待ってから
 *  pushManager.getSubscription()を呼ぶ）に統一することで、
 * Safariでも解除処理まで確実に到達させる。
 */
export const removePushSubscription = async (): Promise<void> => {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await registerServiceWorker();
    if (!registration) return;

    await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe().catch(() => {});
    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  } catch (err) {
    // ここで失敗しても致命的ではない（原因②のRPC側でも
    // 別ユーザーによる引き継ぎができるようフォールバックしているが、
    // 調査のためログには残しておく）。
    console.error("removePushSubscription failed:", err);
  }
};
