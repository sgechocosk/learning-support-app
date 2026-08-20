import { BIN_COUNT, binIndexToLabel } from "../../lib/learningStats";
import { useLearningNotificationStats } from "../../hooks/useLearningNotificationStats";
import { useLearningNotificationTimes } from "../../hooks/useLearningNotificationTimes";

interface SupporterLearningStatsProps {
  pairId: string | null;
}

const CHART_VIEWBOX_HEIGHT = 100;
const AXIS_LABEL_BIN_STEP = 24; // 24ビン = 6時間おきに目盛りを表示

/**
 * 学習時間帯のグラフと、通知候補（タップでON/OFF）を表示するカード。
 * Home.tsx 側で profile.role === "supporter" の場合のみ描画される。
 *
 * グラフ・候補は毎晩1回（推奨は午前4時）のバッチ処理
 * （Edge Function: compute-learning-notification-times）でだけ更新される
 * スナップショット（learning_notification_stats）を参照している。
 * そのため、学習者が日中タイマーを使ってもこのグラフ・候補は当日中は
 * 変化しない（＝「通知候補は深夜にのみ変化する」）。
 *
 * ON/OFF状態は learning_notification_times テーブルに保存される。
 * 候補セット自体の入れ替え（古い候補の削除・新しい候補のデフォルトOFF追加）は
 * 深夜バッチ側で行われるため、このコンポーネント／フックはON/OFFの
 * 読み書きだけを担当する。
 */
export default function SupporterLearningStats({
  pairId,
}: SupporterLearningStatsProps) {
  const {
    bins,
    candidateBins,
    hasData,
    isLoading: isStatsLoading,
  } = useLearningNotificationStats(pairId);

  const {
    enabledMap,
    isLoading: isNotifStateLoading,
    toggle,
  } = useLearningNotificationTimes(pairId);

  const maxVal = Math.max(1, ...bins);

  const axisLabels = Array.from(
    { length: BIN_COUNT / AXIS_LABEL_BIN_STEP + 1 },
    (_, i) => {
      const binIndex = i * AXIS_LABEL_BIN_STEP;
      return binIndex >= BIN_COUNT ? "24:00" : binIndexToLabel(binIndex);
    },
  );

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-4 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl leading-none">📊</span>
        <span className="font-bold text-gray-700 text-sm">
          学習時間帯の傾向
        </span>
      </div>
      <p className="text-[11px] text-gray-400 mb-3">
        毎朝4時に更新されます（当日中は変化しません）
      </p>

      {isStatsLoading ? (
        <div className="h-28 flex items-center justify-center text-sm text-gray-400">
          読み込み中...
        </div>
      ) : !hasData ? (
        <div className="h-28 flex items-center justify-center text-sm text-gray-400 text-center px-4">
          まだタイマー学習の記録がありません
        </div>
      ) : (
        <div className="w-full">
          <svg
            viewBox={`0 0 ${BIN_COUNT} ${CHART_VIEWBOX_HEIGHT}`}
            preserveAspectRatio="none"
            className="w-full h-28"
          >
            {/* 6時間おきの目安線 */}
            {axisLabels.map((_, i) => (
              <line
                key={`grid-${i}`}
                x1={i * AXIS_LABEL_BIN_STEP}
                x2={i * AXIS_LABEL_BIN_STEP}
                y1={0}
                y2={CHART_VIEWBOX_HEIGHT}
                stroke="#E5E7EB"
                strokeWidth={0.3}
              />
            ))}

            {bins.map((v, i) => {
              const barHeight =
                v === 0
                  ? 0
                  : Math.max((v / maxVal) * (CHART_VIEWBOX_HEIGHT - 4), 2);
              const isCandidate = candidateBins.includes(i);
              const isEnabled = isCandidate && enabledMap.get(i) === true;
              // ON: 赤 / 候補だがOFF: アンバー / 候補外: 青
              const fill = isEnabled
                ? "#ef4444"
                : isCandidate
                  ? "#fbbf24"
                  : "#60a5fa";
              return (
                <rect
                  key={i}
                  x={i + 0.12}
                  y={CHART_VIEWBOX_HEIGHT - barHeight}
                  width={0.76}
                  height={barHeight}
                  fill={fill}
                />
              );
            })}
          </svg>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            {axisLabels.map((label, i) => (
              <span key={i}>{label}</span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-gray-400">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-400" />
              学習量
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-400" />
              候補（通知OFF）
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-500" />
              通知ON
            </span>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm">
        <div className="shrink-0">
          <h3 className="text-sm font-bold text-amber-800">通知時刻の候補</h3>
          <p className="text-[11px] text-amber-700/80 mt-0.5">
            タップすると、その時刻に通知が届くようになります
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {hasData ? (
            candidateBins.map((binIndex) => {
              const isEnabled = enabledMap.get(binIndex) === true;
              return (
                <button
                  key={binIndex}
                  type="button"
                  role="switch"
                  aria-checked={isEnabled}
                  disabled={isNotifStateLoading || !pairId}
                  onClick={() => toggle(binIndex)}
                  className={
                    "inline-flex items-center justify-center gap-1.5 font-bold px-3 py-1.5 rounded-lg shadow-sm border transition-colors disabled:opacity-50 " +
                    (isEnabled
                      ? "bg-red-500 text-white border-red-600 hover:bg-red-600"
                      : "bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200")
                  }
                >
                  <span
                    className={
                      "inline-block w-1.5 h-1.5 rounded-full " +
                      (isEnabled ? "bg-white" : "bg-gray-400")
                    }
                  />
                  {binIndexToLabel(binIndex)}
                </button>
              );
            })
          ) : (
            <span className="text-amber-700 text-sm">
              記録が集まると候補が表示されます
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
