import { createContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import type { TimerSettings } from "../types";
import { useProfile } from "../hooks/useProfile";

export const DEFAULT_TIMER_SETTINGS: Omit<
  TimerSettings,
  "pair_id" | "updated_at"
> = {
  interval_minutes: 5,
  continue_in_background: false,
  points_timing: "realtime",
};

interface TimerSettingsContextType {
  settings: TimerSettings | null;
  isLoading: boolean;
  // 支援者のみが呼び出す想定（学習者は編集UIを持たない）。
  // 実際の書き込み可否は Supabase 側の RLS でも強制する。
  updateSettings: (
    updates: Partial<
      Pick<
        TimerSettings,
        "interval_minutes" | "continue_in_background" | "points_timing"
      >
    >,
  ) => Promise<{ error: string | null }>;
}

export const TimerSettingsContext = createContext<
  TimerSettingsContextType | undefined
>(undefined);

export const TimerSettingsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { pairId } = useProfile();
  const [settings, setSettings] = useState<TimerSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async (isBackground = false) => {
    if (!pairId) {
      setSettings(null);
      setIsLoading(false);
      return;
    }
    if (!isBackground) setIsLoading(true);

    const { data, error } = await supabase
      .from("timer_settings")
      .select("*")
      .eq("pair_id", pairId)
      .maybeSingle();

    if (data && !error) {
      setSettings(data as TimerSettings);
    } else if (!error) {
      // 行がまだ無いペアには初期値を作成しておく（どちらの立場でも作成可）
      const { data: created } = await supabase
        .from("timer_settings")
        .insert({ pair_id: pairId, ...DEFAULT_TIMER_SETTINGS })
        .select()
        .single();
      if (created) setSettings(created as TimerSettings);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSettings();

    if (!pairId) return;

    const channel = supabase
      .channel(`timer-settings-pair-${pairId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "timer_settings",
          filter: `pair_id=eq.${pairId}`,
        },
        () => {
          fetchSettings(true);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pairId]);

  const updateSettings: TimerSettingsContextType["updateSettings"] = async (
    updates,
  ) => {
    if (!pairId) return { error: "pair not found" };

    // 即時反映（楽観的更新）
    setSettings((prev) => (prev ? { ...prev, ...updates } : prev));

    const { error } = await supabase
      .from("timer_settings")
      .update(updates)
      .eq("pair_id", pairId);

    if (error) {
      await fetchSettings(true);
      return { error: error.message };
    }
    return { error: null };
  };

  return (
    <TimerSettingsContext.Provider
      value={{ settings, isLoading, updateSettings }}
    >
      {children}
    </TimerSettingsContext.Provider>
  );
};
