import { useEffect, useRef } from "react";

/**
 * 指定した条件が true の間、画面の自動スリープ（オートロック）を防止する。
 * iPhoneで動画を再生している時のように、タイマー動作中は画面が暗くならないようにする。
 *
 * Screen Wake Lock API (https://developer.mozilla.org/docs/Web/API/Screen_Wake_Lock_API)
 * に対応していないブラウザでは何もしない（安全にフォールバック）。
 */
export const useWakeLock = (active: boolean) => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active) return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      return;
    }

    let cancelled = false;

    const requestWakeLock = async () => {
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          // アンマウント/条件変化が先に起きていた場合は即解放する
          sentinel.release().catch(() => {});
          return;
        }
        wakeLockRef.current = sentinel;
      } catch {
        // ユーザーがタブを離れている、省電力モード等で失敗することがあるが無視してよい
        wakeLockRef.current = null;
      }
    };

    requestWakeLock();

    // タブを離れて戻ってきた際、Wake Lockは自動的に解放されているため再取得する
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !wakeLockRef.current) {
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [active]);
};
