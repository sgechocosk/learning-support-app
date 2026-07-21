import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useProfile } from "./useProfile";
import { useTimerSettings } from "./useTimerSettings";

const STORAGE_KEY = "app_timer_session_v2";

export const MIN_INTERVAL_MINUTES = 1;
export const MAX_INTERVAL_MINUTES = 10;

interface StoredSessionState {
  priorLifetimeMs: number;
  accumulatedMs: number;
  runningSince: number | null;
  strawberryCount: number;
  awardedCount: number;
}

const loadState = (): StoredSessionState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("no state");
    const parsed = JSON.parse(raw) as Partial<StoredSessionState>;
    return {
      priorLifetimeMs:
        typeof parsed.priorLifetimeMs === "number" &&
        parsed.priorLifetimeMs >= 0
          ? parsed.priorLifetimeMs
          : 0,
      accumulatedMs:
        typeof parsed.accumulatedMs === "number" && parsed.accumulatedMs >= 0
          ? parsed.accumulatedMs
          : 0,
      runningSince:
        typeof parsed.runningSince === "number" ? parsed.runningSince : null,
      strawberryCount:
        typeof parsed.strawberryCount === "number" &&
        parsed.strawberryCount >= 0
          ? parsed.strawberryCount
          : 0,
      awardedCount:
        typeof parsed.awardedCount === "number" && parsed.awardedCount >= 0
          ? parsed.awardedCount
          : 0,
    };
  } catch {
    return {
      priorLifetimeMs: 0,
      accumulatedMs: 0,
      runningSince: null,
      strawberryCount: 0,
      awardedCount: 0,
    };
  }
};

const saveState = (state: StoredSessionState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
};

const requestAwardPoints = async (amount: number) => {
  if (amount <= 0) return;
  try {
    const { error } = await supabase.rpc("award_timer_points", {
      points: amount,
    });
    if (error) {
      console.warn("Error awarding points", error);
    }
  } catch (e) {
    console.warn("Error awarding points", e);
  }
};

export const useWorkTimer = () => {
  const { profile, updateProfileState } = useProfile();
  const { settings, notifyTimerActive } = useTimerSettings();

  const intervalMinutes = settings?.interval_minutes ?? 5;
  const continueInBackground = settings?.continue_in_background ?? false;
  const pointsTiming = settings?.points_timing ?? "realtime";

  const initial = loadState();
  const [priorLifetimeMs, setPriorLifetimeMs] = useState(
    initial.priorLifetimeMs,
  );
  const [accumulatedMs, setAccumulatedMs] = useState(initial.accumulatedMs);
  const [runningSince, setRunningSince] = useState<number | null>(
    initial.runningSince,
  );
  const [strawberryCount, setStrawberryCount] = useState(
    initial.strawberryCount,
  );
  const [awardedCount, setAwardedCount] = useState(initial.awardedCount);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const isRunning = runningSince !== null;

  const latest = useRef({
    isRunning,
    continueInBackground,
    runningSince,
    accumulatedMs,
    priorLifetimeMs,
    strawberryCount,
    awardedCount,
  });
  latest.current = {
    isRunning,
    continueInBackground,
    runningSince,
    accumulatedMs,
    priorLifetimeMs,
    strawberryCount,
    awardedCount,
  };

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setNowTick(Date.now()), 500);
    return () => clearInterval(id);
  }, [isRunning]);

  // タイマー動作中は支援者側の設定変更をすぐに反映させない。
  // 開始前・停止後（isRunning === false）のタイミングでのみ同期される。
  useEffect(() => {
    notifyTimerActive(isRunning);
  }, [isRunning, notifyTimerActive]);

  const sessionElapsedMs =
    accumulatedMs +
    (isRunning ? Math.max(0, nowTick - (runningSince as number)) : 0);

  const lifetimeElapsedMs = priorLifetimeMs + sessionElapsedMs;

  const intervalMs = intervalMinutes * 60 * 1000;

  useEffect(() => {
    const earned = Math.floor(lifetimeElapsedMs / intervalMs);
    if (earned > strawberryCount) {
      setStrawberryCount(earned);
    }
  }, [lifetimeElapsedMs, intervalMs, strawberryCount]);

  useEffect(() => {
    if (pointsTiming !== "realtime") return;
    const pending = strawberryCount - awardedCount;
    if (pending <= 0) return;

    setAwardedCount(strawberryCount);
    if (profile) {
      updateProfileState({
        points: profile.points + pending,
        total_points: profile.total_points + pending,
      });
    }
    requestAwardPoints(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsTiming, strawberryCount, awardedCount]);

  useEffect(() => {
    saveState({
      priorLifetimeMs,
      accumulatedMs,
      runningSince,
      strawberryCount,
      awardedCount,
    });
  }, [
    priorLifetimeMs,
    accumulatedMs,
    runningSince,
    strawberryCount,
    awardedCount,
  ]);

  const start = useCallback(() => {
    setRunningSince((prev) => (prev !== null ? prev : Date.now()));
    setNowTick(Date.now());
  }, []);

  const stop = useCallback(() => {
    const since = latest.current.runningSince;
    if (since !== null) {
      setAccumulatedMs((acc) => acc + Math.max(0, Date.now() - since));
      setRunningSince(null);
    }
  }, []);

  const completeSession = useCallback(() => {
    const since = latest.current.runningSince;
    const finalAccumulated =
      latest.current.accumulatedMs +
      (since !== null ? Math.max(0, Date.now() - since) : 0);

    if (pointsTiming === "on_finish") {
      const finalStrawberries = Math.floor(
        (latest.current.priorLifetimeMs + finalAccumulated) / intervalMs,
      );
      const pending =
        Math.max(finalStrawberries, latest.current.strawberryCount) -
        latest.current.awardedCount;
      if (pending > 0) {
        if (profile) {
          updateProfileState({
            points: profile.points + pending,
            total_points: profile.total_points + pending,
          });
        }
        requestAwardPoints(pending);
      }
    }

    setRunningSince(null);
    setAccumulatedMs(0);
    setPriorLifetimeMs(0);
    setStrawberryCount(0);
    setAwardedCount(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsTiming, intervalMs, profile]);

  useEffect(() => {
    const handleHide = () => {
      const { isRunning: running, continueInBackground: keepGoing } =
        latest.current;
      if (running && !keepGoing) {
        stop();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") handleHide();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handleHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handleHide);
    };
  }, [stop]);

  useEffect(() => {
    return () => {
      const {
        isRunning: running,
        continueInBackground: keepGoing,
        runningSince: since,
        accumulatedMs: acc,
        priorLifetimeMs: prior,
        strawberryCount: sc,
        awardedCount: ac,
      } = latest.current;

      if (running && !keepGoing && since !== null) {
        const frozenAccumulated = acc + Math.max(0, Date.now() - since);
        saveState({
          priorLifetimeMs: prior,
          accumulatedMs: frozenAccumulated,
          runningSince: null,
          strawberryCount: sc,
          awardedCount: ac,
        });
      }
    };
  }, []);

  const pendingPoints = strawberryCount - awardedCount;

  const msUntilNextStrawberry = Math.max(
    0,
    (strawberryCount + 1) * intervalMs - lifetimeElapsedMs,
  );

  return {
    intervalMinutes,
    continueInBackground,
    pointsTiming,
    isRunning,
    elapsedMs: sessionElapsedMs,
    totalWorkedMs: lifetimeElapsedMs,
    strawberryCount,
    awardedCount,
    pendingPoints,
    msUntilNextStrawberry,
    start,
    stop,
    completeSession,
  };
};

export type { StoredSessionState };
