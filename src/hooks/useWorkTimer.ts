import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useProfile } from "./useProfile";
import { useTimerSettings } from "./useTimerSettings";
import {
  useTimerSession,
  toServerState,
  type TimerSessionRpcRow,
} from "../contexts/TimerSessionContext";
// useAppBadge はここでは呼ばない。呼び出し元は LearnerBadgeSync に一本化する
// (Timer.tsx がアンマウントされた瞬間に、常時表示用のバッジまで
// 誤って clearAppBadge() されてしまうのを防ぐため)。

export const MIN_INTERVAL_MINUTES = 1;
export const MAX_INTERVAL_MINUTES = 10;

interface PointsRpcRow {
  awarded_delta: number;
  awarded_count: number;
  strawberry_count: number;
  elapsed_ms: number;
  points: number;
  total_points: number;
}

export const useWorkTimer = () => {
  const { profile, updateProfileState } = useProfile();
  const { settings, notifyTimerActive } = useTimerSettings();

  // サーバー状態の取得・realtime購読・経過時間/いちご数の計算は
  // TimerSessionProvider(App.tsx直下、タブ開閉と無関係に常時マウント)側で
  // 一元管理される。useWorkTimer はそれを消費するだけ。
  const { serverState, setServerState, isLoaded, elapsedMs, strawberryCount } =
    useTimerSession();

  const continueInBackground = settings?.continue_in_background ?? false;
  const pointsTiming = settings?.points_timing ?? "realtime";

  // 学習者本人のみタイマーを操作できる（サーバー側のRPCでも role を検証している）。
  const learnerId = profile?.role === "learner" ? profile.id : null;

  const [isSyncingPoints, setIsSyncingPoints] = useState(false);

  const latest = useRef({ serverState, continueInBackground });
  latest.current = { serverState, continueInBackground };

  const isSyncingRef = useRef(false);

  // タイマー動作中は支援者側の設定変更をすぐに反映させない
  // （TimerSettingsContext 側の既存の挙動を維持する）。
  useEffect(() => {
    notifyTimerActive(serverState.isRunning);
  }, [serverState.isRunning, notifyTimerActive]);

  const intervalMs = Math.max(serverState.intervalMinutes, 1) * 60 * 1000;
  const awardedCount = serverState.awardedCount;
  const pendingPoints = Math.max(0, strawberryCount - awardedCount);
  const msUntilNextStrawberry = Math.max(
    0,
    (strawberryCount + 1) * intervalMs - elapsedMs,
  );

  /**
   * サーバーに「未付与分のいちごを付与して」と伝える。
   * 付与量はクライアントからは一切渡さず、サーバー自身が
   * 現在の経過時間から計算した未付与分だけを、行ロックの下で1回だけ
   * 加算する。そのため複数タブ/デバイスからほぼ同時に呼ばれても
   * 二重に付与されることはない。
   */
  const syncRealtimePoints = useCallback(async () => {
    if (pointsTiming !== "realtime") return;
    if (!learnerId) return;
    if (isSyncingRef.current) return;

    isSyncingRef.current = true;
    setIsSyncingPoints(true);
    try {
      const { data, error } = await supabase.rpc("sync_timer_points");
      if (error) {
        console.warn("Error syncing points", error);
        return;
      }
      const result = (data?.[0] ?? null) as PointsRpcRow | null;
      if (result) {
        setServerState((prev) => ({
          ...prev,
          awardedCount: result.awarded_count,
        }));
        if (profile) {
          updateProfileState({
            points: result.points,
            total_points: result.total_points,
          });
        }
      }
    } catch (e) {
      console.warn("Error syncing points", e);
    } finally {
      isSyncingRef.current = false;
      setIsSyncingPoints(false);
    }
  }, [pointsTiming, learnerId, profile, updateProfileState, setServerState]);

  // 画面上のいちごの数が増えた「その瞬間」に同期を試みる
  useEffect(() => {
    if (pointsTiming !== "realtime") return;
    if (strawberryCount > awardedCount) {
      syncRealtimePoints();
    }
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

  const start = useCallback(async () => {
    if (!learnerId) return;

    // 即時のUI反応用の楽観的更新。実際の開始時刻はサーバーの応答で必ず
    // 上書きされる（既に他タブ/他デバイスで動いていれば、その開始時刻に
    // 揃えられる＝新しい別セッションにはならない）。
    setServerState((prev) =>
      prev.isRunning
        ? prev
        : {
            ...prev,
            isRunning: true,
            startedAtMs: Date.now() + prev.clockOffsetMs,
          },
    );

    const { data, error } = await supabase.rpc("start_timer_session");
    if (error) {
      console.warn("Error starting timer session", error);
      return;
    }
    if (data && data[0]) {
      setServerState(toServerState(data[0] as TimerSessionRpcRow));
    }
  }, [learnerId, setServerState]);

  const stop = useCallback(async () => {
    if (!learnerId) return;

    setServerState((prev) => {
      if (!prev.isRunning || prev.startedAtMs === null) return prev;
      const frozen =
        prev.accumulatedMs +
        Math.max(0, Date.now() + prev.clockOffsetMs - prev.startedAtMs);
      return {
        ...prev,
        isRunning: false,
        startedAtMs: null,
        accumulatedMs: frozen,
      };
    });

    const { data, error } = await supabase.rpc("stop_timer_session");
    if (error) {
      console.warn("Error stopping timer session", error);
      return;
    }
    if (data && data[0]) {
      setServerState(toServerState(data[0] as TimerSessionRpcRow));
    }
  }, [learnerId, setServerState]);

  /**
   * 学習者が完了ボタン（確認モーダルの「完了する」）を押した瞬間に呼ばれる。
   * サーバー側で「未付与分の確定付与」と「セッションを0へリセット」を
   * 同一トランザクション・同一行ロックの中でアトミックに行うため、
   * ここでも複数タブ/デバイスからの同時操作で不整合や二重付与は起きない。
   * 通信に失敗した場合はセッションをリセットせず、いちごを失わないように
   * して呼び出し元へ失敗を伝える（呼び出し元でエラー表示・再試行が可能）。
   */
  const completeSession = useCallback(async (): Promise<boolean> => {
    if (!learnerId) return false;

    setIsSyncingPoints(true);
    try {
      const { data, error } = await supabase.rpc("complete_timer_session");
      if (error) {
        console.warn("Error completing timer session", error);
        return false;
      }
      const result = (data?.[0] ?? null) as PointsRpcRow | null;
      if (!result) return false;

      if (profile) {
        updateProfileState({
          points: result.points,
          total_points: result.total_points,
        });
      }

      setServerState((prev) => ({
        ...prev,
        isRunning: false,
        startedAtMs: null,
        accumulatedMs: 0,
        awardedCount: 0,
      }));
      return true;
    } catch (e) {
      console.warn("Error completing timer session", e);
      return false;
    } finally {
      setIsSyncingPoints(false);
    }
  }, [learnerId, profile, updateProfileState, setServerState]);

  useEffect(() => {
    const handleHide = () => {
      const { serverState: state, continueInBackground: keepGoing } =
        latest.current;
      if (state.isRunning && !keepGoing) {
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

  return {
    isLoaded,
    intervalMinutes: serverState.intervalMinutes,
    continueInBackground,
    pointsTiming,
    isRunning: serverState.isRunning,
    elapsedMs,
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
