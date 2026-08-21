import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { BIN_COUNT } from "../lib/learningStats";

export interface LearningNotificationStats {
  bins: number[];
  candidateBins: number[];
  hasData: boolean;
  computedForJstDate: string | null;
}

const EMPTY_STATS: LearningNotificationStats = {
  bins: new Array(BIN_COUNT).fill(0),
  candidateBins: [],
  hasData: false,
  computedForJstDate: null,
};

/**
 * 学習時間帯グラフ・通知候補のスナップショット（learning_notification_stats）
 * を読み取るフック。
 *
 * このスナップショットは compute-learning-notification-times（Edge Function、
 * 毎晩1回・推奨は午前4時実行）だけが書き込む。つまりグラフの内容・通知候補は
 * その深夜バッチが走るまでは変化しない（学習者が日中タイマーを使っても
 * その日のうちは揺れ動かない）。
 *
 * アプリを開いたままバッチ実行時刻をまたいだ場合にも自動で最新化されるよう、
 * realtimeで該当ペアの行のUPDATEを購読している。
 */
export function useLearningNotificationStats(pairId: string | null) {
  const [stats, setStats] = useState<LearningNotificationStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!pairId) {
      setStats(EMPTY_STATS);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const load = async () => {
      const { data, error } = await supabase
        .from("learning_notification_stats")
        .select("bins, candidate_bins, computed_for_jst_date")
        .eq("pair_id", pairId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("[useLearningNotificationStats] fetch failed:", error);
        setStats(EMPTY_STATS);
      } else if (data) {
        const bins = (data.bins ?? []) as number[];
        setStats({
          bins,
          candidateBins: (data.candidate_bins ?? []) as number[],
          hasData: bins.some((v) => v > 0),
          computedForJstDate: data.computed_for_jst_date as string | null,
        });
      } else {
        // 初回バッチ実行がまだ行われていない（新規ペアなど）
        setStats(EMPTY_STATS);
      }
      setIsLoading(false);
    };

    load();

    // 深夜バッチ実行後、アプリを開きっぱなしでも自動的に最新のグラフへ切り替わるように
    const channel = supabase
      .channel(`learning-notification-stats-${pairId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "learning_notification_stats",
          filter: `pair_id=eq.${pairId}`,
        },
        () => {
          load();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [pairId]);

  return { ...stats, isLoading };
}
