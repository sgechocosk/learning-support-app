import { useRef, useState, useCallback, useEffect } from "react";

const THRESHOLD = 70; // これ以上引っ張ると「離すと更新」になる(px)
const MAX_PULL = 110; // インジケータの最大表示量(px)
const RESISTANCE = 2.2; // 大きいほど引っ張りが重くなる

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  disabled?: boolean;
}

/**
 * containerRef を「スクロールしたい範囲のラッパー要素」に渡すと、
 * その祖先で実際にスクロールしている要素(overflow-y: auto/scroll)を自動検出し、
 * scrollTop === 0 のときだけ下方向のタッチをプルダウンとして扱う。
 *
 * - 振動(Haptic)は一切呼び出さない
 * - onRefresh 完了までインジケータの高さを保持するだけで、
 *   リスト本体(children)の描画は一切差し替えない
 */
export function usePullToRefresh<T extends HTMLElement>({
  onRefresh,
  disabled = false,
}: UsePullToRefreshOptions) {
  const containerRef = useRef<T>(null);
  const scrollElRef = useRef<HTMLElement | null>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const readyToRelease = useRef(false);

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 最も近いスクロール可能な祖先要素を解決する
  useEffect(() => {
    let el: HTMLElement | null = containerRef.current;
    while (el && el !== document.body) {
      const style = getComputedStyle(el);
      if (
        /(auto|scroll)/.test(style.overflowY) &&
        el.scrollHeight > el.clientHeight
      ) {
        scrollElRef.current = el;
        return;
      }
      el = el.parentElement;
    }
    scrollElRef.current = null;
  });

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return;
      const scrollEl = scrollElRef.current;
      // 一番上までスクロールされている時だけプル開始を許可
      if (scrollEl && scrollEl.scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
      readyToRelease.current = false;
    },
    [disabled, isRefreshing],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!pulling.current || disabled || isRefreshing) return;
      const scrollEl = scrollElRef.current;
      if (scrollEl && scrollEl.scrollTop > 0) {
        // 途中で通常スクロールに切り替わったら中断
        pulling.current = false;
        setPullDistance(0);
        return;
      }

      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }

      // ゴムのような抵抗をつけて、線形に伸びないようにする
      const distance = Math.min(delta / RESISTANCE, MAX_PULL);
      setPullDistance(distance);
      readyToRelease.current = distance >= THRESHOLD;

      // 下に引っ張っている間だけ、背後のスクロールを止める
      // (これにより画面がガタつかず、ブラウザのネイティブPTRとも衝突しない)
      if (delta > 5 && e.cancelable) e.preventDefault();
    },
    [disabled, isRefreshing],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (readyToRelease.current) {
      setIsRefreshing(true);
      setPullDistance(THRESHOLD); // 更新中はインジケータ位置を保持
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
    readyToRelease.current = false;
  }, [onRefresh]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    // touchmove は preventDefault するため passive:false が必須
    node.addEventListener("touchstart", handleTouchStart, { passive: true });
    node.addEventListener("touchmove", handleTouchMove, { passive: false });
    node.addEventListener("touchend", handleTouchEnd, { passive: true });
    node.addEventListener("touchcancel", handleTouchEnd, { passive: true });
    return () => {
      node.removeEventListener("touchstart", handleTouchStart);
      node.removeEventListener("touchmove", handleTouchMove);
      node.removeEventListener("touchend", handleTouchEnd);
      node.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    isReady: pullDistance >= THRESHOLD,
    progress: Math.min(pullDistance / THRESHOLD, 1),
  };
}
