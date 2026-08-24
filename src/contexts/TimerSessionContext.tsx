import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabaseClient";
import { useProfile } from "../hooks/useProfile";

const DISPLAY_CACHE_KEY = "app_timer_session_display_cache_v3";

interface DisplayCache {
  accumulatedMs: number;
  awardedCount: number;
}

const loadDisplayCache = (): DisplayCache | null => {
  try {
    const raw = localStorage.getItem(DISPLAY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DisplayCache>;
    if (
      typeof parsed.accumulatedMs !== "number" ||
      parsed.accumulatedMs < 0 ||
      typeof parsed.awardedCount !== "number" ||
      parsed.awardedCount < 0
    )
      return null;
    return {
      accumulatedMs: parsed.accumulatedMs,
      awardedCount: parsed.awardedCount,
    };
  } catch {
    return null;
  }
};

const saveDisplayCache = (cache: DisplayCache) => {
  try {
    localStorage.setItem(DISPLAY_CACHE_KEY, JSON.stringify(cache));
  } catch {}
};

export interface ServerTimerState {
  isRunning: boolean;
  startedAtMs: number | null;
  accumulatedMs: number;
  awardedCount: number;
  intervalMinutes: number;
  clockOffsetMs: number;
}

const EMPTY_STATE: ServerTimerState = {
  isRunning: false,
  startedAtMs: null,
  accumulatedMs: 0,
  awardedCount: 0,
  intervalMinutes: 5,
  clockOffsetMs: 0,
};

export interface TimerSessionRpcRow {
  is_running: boolean;
  started_at: string | null;
  accumulated_ms: number;
  awarded_count: number;
  interval_minutes: number;
  elapsed_ms: number;
  strawberry_count: number;
  server_now: string;
}

export const toServerState = (row: TimerSessionRpcRow): ServerTimerState => {
  const serverNowMs = new Date(row.server_now).getTime();
  return {
    isRunning: row.is_running,
    startedAtMs: row.started_at ? new Date(row.started_at).getTime() : null,
    accumulatedMs: row.accumulated_ms,
    awardedCount: row.awarded_count,
    intervalMinutes: row.interval_minutes,
    clockOffsetMs: serverNowMs - Date.now(),
  };
};

interface TimerSessionContextType {
  isLoaded: boolean;
  serverState: ServerTimerState;
  setServerState: React.Dispatch<React.SetStateAction<ServerTimerState>>;
  elapsedMs: number;
  strawberryCount: number;
}

const TimerSessionContext = createContext<TimerSessionContextType | undefined>(
  undefined,
);

/**
 * サーバー権威のタイマーセッション状態(いちご数を含む)を、
 * どのタブを開いていても常に最新に保つためのProvider。
 * ProfileProvider配下・activeTabの開閉と無関係な場所(App.tsx)で
 * ログイン中は常にマウントされ続けることを前提にしている。
 */
export const TimerSessionProvider = ({ children }: { children: ReactNode }) => {
  const { profile } = useProfile();
  const learnerId = profile?.role === "learner" ? profile.id : null;

  const [serverState, setServerState] = useState<ServerTimerState>(() => {
    const cached = loadDisplayCache();
    if (!cached) return EMPTY_STATE;
    return {
      ...EMPTY_STATE,
      accumulatedMs: cached.accumulatedMs,
      awardedCount: cached.awardedCount,
    };
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  // 起動時（学習者ログイン確定時）にサーバー権威の状態を1回だけ取得する
  useEffect(() => {
    if (!learnerId) {
      setServerState(EMPTY_STATE);
      setIsLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_timer_session_state");
      if (!cancelled && !error && data && data[0]) {
        setServerState(toServerState(data[0] as TimerSessionRpcRow));
      }
      if (!cancelled) setIsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [learnerId]);

  // Timerタブを開いていなくても、他タブ/他デバイスでの状態変化を常に追従する
  useEffect(() => {
    if (!learnerId) return;
    const channel = supabase
      .channel(`timer-session-${learnerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "timer_sessions",
          filter: `learner_id=eq.${learnerId}`,
        },
        (payload) => {
          const row = payload.new as {
            started_at: string | null;
            accumulated_ms: number;
            awarded_count: number;
          } | null;
          if (!row) return;
          setServerState((prev) => ({
            ...prev,
            isRunning: row.started_at !== null,
            startedAtMs: row.started_at
              ? new Date(row.started_at).getTime()
              : null,
            accumulatedMs: row.accumulated_ms,
            awardedCount: row.awarded_count,
          }));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [learnerId]);

  // 稼働中のみ500ms tickで経過時間を更新（停止中はバッジ値も固定でよい）
  useEffect(() => {
    if (!serverState.isRunning) return;
    const id = setInterval(() => setNowTick(Date.now()), 500);
    return () => clearInterval(id);
  }, [serverState.isRunning]);

  useEffect(() => {
    saveDisplayCache({
      accumulatedMs: serverState.accumulatedMs,
      awardedCount: serverState.awardedCount,
    });
  }, [serverState.accumulatedMs, serverState.awardedCount]);

  const elapsedMs =
    serverState.accumulatedMs +
    (serverState.isRunning && serverState.startedAtMs !== null
      ? Math.max(
          0,
          nowTick + serverState.clockOffsetMs - serverState.startedAtMs,
        )
      : 0);

  const intervalMs = Math.max(serverState.intervalMinutes, 1) * 60 * 1000;
  const strawberryCount = Math.floor(elapsedMs / intervalMs);

  return (
    <TimerSessionContext.Provider
      value={{
        isLoaded,
        serverState,
        setServerState,
        elapsedMs,
        strawberryCount,
      }}
    >
      {children}
    </TimerSessionContext.Provider>
  );
};

export const useTimerSession = () => {
  const ctx = useContext(TimerSessionContext);
  if (!ctx)
    throw new Error("useTimerSession must be used within TimerSessionProvider");
  return ctx;
};
