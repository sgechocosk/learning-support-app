import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

interface NotificationTimeRow {
  bin_index: number;
  is_enabled: boolean;
}

/**
 * 「通知時刻の候補」ごとのON/OFF状態（learning_notification_times）を
 * 読み書きするフック。
 *
 * 候補セット自体の reconcile（古い候補の削除・新しい候補のOFF追加）は
 * 深夜バッチ（Edge Function: compute-learning-notification-times）が
 * サーバー側で一括して行うため、このフックは
 *   - 現在DBにある行（＝現在の候補）のON/OFF状態を読む
 *   - タップされたらON/OFFを切り替えてDBに保存する
 * だけを担当する。
 */
export function useLearningNotificationTimes(pairId: string | null) {
  const [enabledMap, setEnabledMap] = useState<Map<number, boolean>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const fetchRows = useCallback(async () => {
    if (!pairId) {
      setEnabledMap(new Map());
      setIsLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("learning_notification_times")
      .select("bin_index, is_enabled")
      .eq("pair_id", pairId);

    if (!error && data) {
      setEnabledMap(
        new Map(
          (data as NotificationTimeRow[]).map((r) => [
            r.bin_index,
            r.is_enabled,
          ]),
        ),
      );
    }
    setIsLoading(false);
  }, [pairId]);

  useEffect(() => {
    setIsLoading(true);
    fetchRows();

    if (!pairId) return;

    // 深夜バッチによる候補の入れ替え（削除/追加）や、他端末からのON/OFF操作を
    // 開きっぱなしの画面にも反映させる。
    const channel = supabase
      .channel(`learning-notification-times-${pairId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "learning_notification_times",
          filter: `pair_id=eq.${pairId}`,
        },
        () => {
          fetchRows();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pairId, fetchRows]);

  const toggle = useCallback(
    async (binIndex: number) => {
      if (!pairId) return;

      const current = enabledMap.get(binIndex) ?? false;
      const next = !current;

      // 楽観的更新
      setEnabledMap((prev) => new Map(prev).set(binIndex, next));

      const { error } = await supabase
        .from("learning_notification_times")
        .update({ is_enabled: next })
        .eq("pair_id", pairId)
        .eq("bin_index", binIndex);

      if (error) {
        // 失敗したら元に戻す
        setEnabledMap((prev) => new Map(prev).set(binIndex, current));
      }
    },
    [pairId, enabledMap],
  );

  return { enabledMap, isLoading, toggle };
}
