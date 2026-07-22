import { useEffect, useRef, useState } from "react";

interface UseFitScaleOptions {
  /** 元のコンテンツ幅（px） */
  targetWidth: number;
  /** 元のコンテンツ高さ（px） */
  targetHeight: number;
  /** これ以上は縮小しない下限スケール（スマホで小さくなりすぎるのを防ぐ） */
  minScale?: number;
  /** これ以上は拡大しない上限スケール */
  maxScale?: number;
}

/**
 * 親要素の実際のサイズ（幅・高さ両方）を監視し、
 * targetWidth x targetHeight のコンテンツが親からはみ出さない
 * ちょうど良い scale 値を返す。
 *
 * コンテンツ自体のサイズ（width/height）は変更せず、
 * transform: scale() で見た目だけ縮小/拡大するための値。
 */
export function useFitScale({
  targetWidth,
  targetHeight,
  minScale = 0.55,
  maxScale = 1,
}: UseFitScaleOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(maxScale);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const computeScale = (width: number, height: number) => {
      if (width <= 0 || height <= 0) return;
      const widthScale = width / targetWidth;
      const heightScale = height / targetHeight;
      // 見切れないように、幅・高さ双方に収まる方（小さい方）を採用
      const fitScale = Math.min(widthScale, heightScale, maxScale);
      // 極端に小さくなりすぎないよう下限を設ける
      setScale(Math.max(fitScale, minScale));
    };

    computeScale(el.clientWidth, el.clientHeight);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        computeScale(width, height);
      }
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, [targetWidth, targetHeight, minScale, maxScale]);

  return { containerRef, scale };
}
