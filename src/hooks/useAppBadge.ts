import { useEffect, useRef } from "react";

// Badging API (navigator.setAppBadge / clearAppBadge) は TS のバージョンによって
// lib.dom.d.ts に型が無かったり、逆に必須プロパティとして定義されていたりする。
// どちらの環境でも安全にコンパイルできるよう、Navigator を継承せず
// 必要なメソッドだけを持つ独立した型として扱う。
type BadgeNavigator = {
  setAppBadge: (contents?: number) => Promise<void>;
  clearAppBadge: () => Promise<void>;
};

const getBadgeNavigator = (): BadgeNavigator | null => {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as unknown as Partial<BadgeNavigator>;
  return typeof nav.setAppBadge === "function" &&
    typeof nav.clearAppBadge === "function"
    ? (nav as BadgeNavigator)
    : null;
};

/** このブラウザ/環境が Badging API に対応しているかどうか */
export const isAppBadgeSupported = (): boolean => getBadgeNavigator() !== null;

/**
 * iOS/iPadOS は「通知の許可」が下りていないと、setAppBadge() を呼んでも
 * バッジが画面に表示されない（WebKit の仕様）。
 * ここでは Notification API 自体が使えるかどうかも含めて安全に判定する。
 */
const getNotificationPermission = (): NotificationPermission | null => {
  if (typeof Notification === "undefined") return null;
  try {
    return Notification.permission;
  } catch {
    return null;
  }
};

// 同じセッション内で許可リクエストを何度も出さないようにするための
// モジュールスコープのフラグ（コンポーネントの再マウントをまたいでも1回だけにする）。
let permissionRequestStarted = false;

/**
 * 通知の許可をリクエストする。
 * - すでに "granted" / "denied" が確定している場合は何もしない
 *   （denied の場合、ブラウザは再度ダイアログを出さないため無意味な呼び出しになる）。
 * - "default"（未回答）の場合のみ、ユーザーにダイアログを表示してリクエストする。
 * - Notification API 自体が存在しない環境（Badging API はあるが Notification が
 *   ない、等）では何もしない。
 *
 * 呼び出し元が「ここでリクエストしてよいタイミング」を判断して呼ぶ想定
 * （例: タイマー開始時など、文脈が明確な操作の中で呼ぶ）。
 */
export const requestBadgeNotificationPermission = async (): Promise<void> => {
  const permission = getNotificationPermission();
  if (permission !== "default") return;
  if (permissionRequestStarted) return;
  permissionRequestStarted = true;

  try {
    await Notification.requestPermission();
  } catch {
    // ユーザー操作外での呼び出しなど、環境によっては例外になることがあるが
    // バッジ機能自体が使えないだけなので握りつぶす。
  }
};

/**
 * PWA アイコンにバッジ（未読件数のような数字）を表示するためのフック。
 *
 * - count に正の整数を渡すとその数がアプリアイコンに表示される。
 * - count が 0 / null / undefined の場合はバッジを消す。
 * - Badging API 未対応のブラウザでは何もしない（例外を投げない）。
 * - iOS/iPadOS では通知許可が下りていないとバッジが表示されないため、
 *   バッジを立てようとするタイミングで許可が未回答（"default"）であれば
 *   自動的に許可リクエストを行う。
 *
 * 呼び出し側は「現在表示したい数」を渡すだけでよく、
 * 実際に setAppBadge / clearAppBadge を呼ぶかどうかの重複呼び出し抑制や
 * エラーハンドリング、通知許可のリクエストはこのフック内で行う。
 */
export const useAppBadge = (count: number | null | undefined) => {
  const lastSentRef = useRef<number | null>(null);

  useEffect(() => {
    const nav = getBadgeNavigator();
    if (!nav) return;

    const nextValue =
      typeof count === "number" && Number.isFinite(count) && count > 0
        ? Math.floor(count)
        : 0;

    // 直前に送った値と同じなら何もしない（無駄な呼び出しを避ける）。
    if (lastSentRef.current === nextValue) return;
    lastSentRef.current = nextValue;

    if (nextValue > 0) {
      // iOS では通知許可が無いとバッジが表示されないため、
      // バッジを立てる直前に（未回答であれば）許可をリクエストする。
      // すでに許可/拒否が確定していれば即座に解決するので実質待たない。
      requestBadgeNotificationPermission().finally(() => {
        nav.setAppBadge(nextValue).catch(() => {
          // 一部環境（未インストール状態、通知拒否済みなど）では失敗する/
          // 無視されることがあるが、アプリの動作には影響しないため握りつぶす。
        });
      });
    } else {
      nav.clearAppBadge().catch(() => {});
    }
  }, [count]);

  // タブを閉じる/コンポーネントが完全にアンマウントされる時にバッジを消す。
  useEffect(() => {
    return () => {
      const nav = getBadgeNavigator();
      if (!nav) return;
      nav.clearAppBadge().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
