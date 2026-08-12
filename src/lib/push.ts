import { supabase } from "./supabaseClient";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as
  | string
  | undefined;

/** base64url文字列(VAPID公開鍵)をpushManager.subscribeが要求するUint8Arrayに変換する */
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

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
export const isPushSupported = (): boolean => getPushUnsupportedReason() === null;

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
 */
export const ensurePushSubscription = async (
  userId: string,
  pairId: string,
): Promise<{ error: string | null }> => {
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

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        pair_id: pairId,
        endpoint: subscription.endpoint,
        p256dh,
        auth_key: auth,
        user_agent: navigator.userAgent,
      },
      { onConflict: "endpoint" },
    );

    return { error: error?.message ?? null };
  } catch (err) {
    console.error("ensurePushSubscription failed:", err);
    return {
      error: err instanceof Error ? err.message : "unknown push error",
    };
  }
};

/** この端末のpush購読を解除し、DB上のレコードも削除する（通知をオフにする場合用） */
export const removePushSubscription = async (): Promise<void> => {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe().catch(() => {});
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
};
