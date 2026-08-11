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
 * PWA アイコンにバッジ（未読件数のような数字）を表示するためのフック。
 *
 * - count に正の整数を渡すとその数がアプリアイコンに表示される。
 * - count が 0 / null / undefined の場合はバッジを消す。
 * - Badging API 未対応のブラウザでは何もしない（例外を投げない）。
 *
 * 呼び出し側は「現在表示したい数」を渡すだけでよく、
 * 実際に setAppBadge / clearAppBadge を呼ぶかどうかの重複呼び出し抑制や
 * エラーハンドリングはこのフック内で行う。
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
      nav.setAppBadge(nextValue).catch(() => {
        // 一部環境（未インストール状態など）では失敗することがあるが、
        // アプリの動作には影響しないため握りつぶす。
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
