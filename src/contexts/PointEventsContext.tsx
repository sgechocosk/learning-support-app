import { createContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import type { PointEvent } from "../types";
import { useProfile } from "../hooks/useProfile";

// 日本時刻・午前4時始まりの「日」を "YYYY-MM-DD" で返す。
// DBの point_events.jst_date（date型）と文字列として一致する形式にしている。
function getJstResetDayKey(date: Date): string {
  const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const RESET_HOUR_MS = 4 * 60 * 60 * 1000;
  const shifted = new Date(date.getTime() + JST_OFFSET_MS - RESET_HOUR_MS);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface PointEventsContextType {
  events: PointEvent[];
  isLoading: boolean;
  /** 今日（日本時刻4時更新）に獲得したいちごの合計（タスク+タイマー） */
  todayTotal: number;
  /** 連続獲得日数。DBの get_current_streak RPCの結果。 */
  streakDays: number;
  refresh: () => Promise<void>;
}

export const PointEventsContext = createContext<
  PointEventsContextType | undefined
>(undefined);

export const PointEventsProvider = ({ children }: { children: ReactNode }) => {
  const { pairId } = useProfile();
  const [events, setEvents] = useState<PointEvent[]>([]);
  const [streakDays, setStreakDays] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [todayKey, setTodayKey] = useState(() => getJstResetDayKey(new Date()));

  // 日をまたいだら（日本時刻4時）表示上の「今日」を切り替えるため定期チェックする
  useEffect(() => {
    const id = setInterval(() => {
      const key = getJstResetDayKey(new Date());
      setTodayKey((prev) => (prev === key ? prev : key));
    }, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const fetchAll = async (isBackground = false) => {
    if (!pairId) {
      setEvents([]);
      setStreakDays(0);
      setIsLoading(false);
      return;
    }
    if (!isBackground) setIsLoading(true);

    // 直近90日分あれば連続日数の計算には十分（フロント側の表示上限も90）
    const since = new Date();
    since.setDate(since.getDate() - 120);

    const [
      { data: eventRows, error: eventsError },
      { data: streak, error: streakError },
    ] = await Promise.all([
      supabase
        .from("point_events")
        .select("*")
        .eq("pair_id", pairId)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false }),
      supabase.rpc("get_current_streak", { p_pair_id: pairId }),
    ]);

    if (eventRows && !eventsError) setEvents(eventRows as PointEvent[]);
    if (typeof streak === "number" && !streakError) setStreakDays(streak);

    setIsLoading(false);
  };

  useEffect(() => {
    fetchAll();

    if (!pairId) return;

    const channel = supabase
      .channel(`point-events-pair-${pairId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "point_events",
          filter: `pair_id=eq.${pairId}`,
        },
        () => {
          fetchAll(true);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pairId]);

  const todayTotal = events
    .filter((e) => e.jst_date === todayKey)
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <PointEventsContext.Provider
      value={{
        events,
        isLoading,
        todayTotal,
        streakDays,
        refresh: () => fetchAll(true),
      }}
    >
      {children}
    </PointEventsContext.Provider>
  );
};
