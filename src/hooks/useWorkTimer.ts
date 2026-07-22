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

/**
 * サーバー（プロフィールDB）へのいちご付与リクエスト。
 * 成功したかどうかを boolean で返し、呼び出し側は成功時のみ
 * ローカルの「付与済みカウント」を進める。失敗時はローカル状態を
 * 変更しないことで、再試行によって取りこぼし（データの紛失）を防ぐ。
 */
const requestAwardPoints = async (amount: number): Promise<boolean> => {
  if (amount <= 0) return true;
  try {
    const { error } = await supabase.rpc("award_timer_points", {
      p_points: amount,
    });
    if (error) {
      console.warn("Error awarding points", error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("Error awarding points", e);
    return false;
  }
};

export const useWorkTimer = () => {
  const { profile, updateProfileState, refreshProfile } = useProfile();
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
  const [isSyncingPoints, setIsSyncingPoints] = useState(false);

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

  // 進行中のDB同期リクエストが重複発火しないようにするフラグ
  const isSyncingRef = useRef(false);

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

  // 「リアルタイム」設定の場合、画面上のいちごの数（strawberryCount）が
  // 増えるたびに、その差分を即座にDBへ反映する。
  // 反映が成功した場合のみ awardedCount を進めることで、通信エラー等で
  // 更新が失敗しても「付与済み扱いなのにDBには残っていない」という
  // 予期しないデータの紛失を防ぐ（次のトリガーで自動的に再試行される）。
  const syncRealtimePoints = useCallback(async () => {
    if (pointsTiming !== "realtime") return;
    if (isSyncingRef.current) return;

    const pending =
      latest.current.strawberryCount - latest.current.awardedCount;
    if (pending <= 0) return;

    isSyncingRef.current = true;
    setIsSyncingPoints(true);
    const targetCount = latest.current.strawberryCount;
    try {
      const ok = await requestAwardPoints(pending);
      if (ok) {
        setAwardedCount((prev) => Math.max(prev, targetCount));
        if (profile) {
          updateProfileState({
            points: profile.points + pending,
            total_points: profile.total_points + pending,
          });
        }
        // ローカルの加算はあくまで即時表示用の楽観的更新。
        // サーバー側の実際の値（トリガー計算結果）で必ず上書きし、
        // 連続付与時の取りこぼしやズレが蓄積しないようにする。
        await refreshProfile();
      }
      // 失敗時は awardedCount を進めない。strawberryCount /
      // awardedCount のどちらかが変化した際や、次の再試行タイミングで
      // 再度この関数が呼ばれ、未送信分が送られる。
    } finally {
      isSyncingRef.current = false;
      setIsSyncingPoints(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsTiming, profile]);

  // 画面上の数字（strawberryCount）が変化した「その瞬間」に同期を試みる
  useEffect(() => {
    syncRealtimePoints();
  }, [pointsTiming, strawberryCount, awardedCount, syncRealtimePoints]);

  // 通信失敗時の取りこぼし対策: オンライン復帰時・タブがフォアグラウンドに
  // 戻った時・一定間隔ごとに、未送信分が残っていれば再送を試みる。
  useEffect(() => {
    if (pointsTiming !== "realtime") return;

    const retry = () => {
      syncRealtimePoints();
    };

    window.addEventListener("online", retry);
    document.addEventListener("visibilitychange", retry);
    const intervalId = setInterval(retry, 15000);

    return () => {
      window.removeEventListener("online", retry);
      document.removeEventListener("visibilitychange", retry);
      clearInterval(intervalId);
    };
  }, [pointsTiming, syncRealtimePoints]);

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

  /**
   * 学習者が完了ボタン（確認モーダルの「完了する」）を押した瞬間に呼ばれる。
   * 「タイマー終了後にまとめて付与」設定の場合はここで初めてDBへの
   * 付与リクエストを送る。DBへの反映が確認できた場合にのみローカルの
   * セッション状態をリセットする。反映に失敗した場合はセッションを
   * リセットせず、いちごを失わないようにして呼び出し元へ失敗を伝える
   * （呼び出し元でエラー表示・再試行が可能）。
   */
  const completeSession = useCallback(async (): Promise<boolean> => {
    const since = latest.current.runningSince;
    const finalAccumulated =
      latest.current.accumulatedMs +
      (since !== null ? Math.max(0, Date.now() - since) : 0);

    if (pointsTiming === "on_finish") {
      const finalStrawberries = Math.floor(
        (latest.current.priorLifetimeMs + finalAccumulated) / intervalMs,
      );
      const finalCount = Math.max(
        finalStrawberries,
        latest.current.strawberryCount,
      );
      const pending = finalCount - latest.current.awardedCount;

      if (pending > 0) {
        setIsSyncingPoints(true);
        let ok: boolean;
        try {
          ok = await requestAwardPoints(pending);
        } finally {
          setIsSyncingPoints(false);
        }

        if (!ok) {
          // DBへの反映が確認できるまでセッションは維持し、
          // 貯めたいちごが失われないようにする。
          return false;
        }

        setAwardedCount(finalCount);
        if (profile) {
          updateProfileState({
            points: profile.points + pending,
            total_points: profile.total_points + pending,
          });
        }
        await refreshProfile();
      }
    } else {
      // realtime設定でも、直前に未送信分が残っている可能性があるため
      // 念のため最後にもう一度同期を試みる。
      await syncRealtimePoints();
      if (latest.current.strawberryCount > latest.current.awardedCount) {
        return false;
      }
    }

    setRunningSince(null);
    setAccumulatedMs(0);
    setPriorLifetimeMs(0);
    setStrawberryCount(0);
    setAwardedCount(0);
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsTiming, intervalMs, profile, syncRealtimePoints]);

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
    isSyncingPoints,
    start,
    stop,
    completeSession,
  };
};

export type { StoredSessionState };
