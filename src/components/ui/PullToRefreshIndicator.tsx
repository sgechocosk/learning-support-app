interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  isReady: boolean;
}

// リスト先頭に挿入して使う、高さが可変のインジケータ。
// 画面全体を覆うオーバーレイではないため、他のコンテンツは常に表示され続ける。
export const PullToRefreshIndicator = ({
  pullDistance,
  isRefreshing,
  isReady,
}: PullToRefreshIndicatorProps) => {
  if (pullDistance === 0 && !isRefreshing) return null;

  const height = isRefreshing ? 44 : pullDistance;

  return (
    <div
      className="flex items-center justify-center gap-2 overflow-hidden text-sky-500 text-xs"
      style={{
        height,
        transition: isRefreshing ? "height 0.2s ease" : "none",
      }}
      aria-live="polite"
    >
      <span
        className={`inline-block w-4 h-4 rounded-full border-2 border-sky-400 border-t-transparent ${
          isRefreshing ? "animate-spin" : ""
        }`}
        style={
          isRefreshing
            ? undefined
            : {
                transform: `rotate(${isReady ? 180 : 0}deg)`,
                transition: "transform 0.2s ease",
              }
        }
      />
      <span>
        {isRefreshing ? "更新中..." : isReady ? "離すと更新" : "引っ張って更新"}
      </span>
    </div>
  );
};
