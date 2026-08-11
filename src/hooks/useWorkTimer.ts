import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useProfile } from "./useProfile";
import { useTimerSettings } from "./useTimerSettings";
import { useAppBadge } from "./useAppBadge";

export const MIN_INTERVAL_MINUTES = 1;
export const MAX_INTERVAL_MINUTES = 10;

// localStorage は「表示を即座に復元するためのキャッシュ」に過ぎない。
// 実際に付与されるいちごの数はすべてサーバー（timer_sessionsテーブルと
// SECURITY DEFINER の RPC群）が計算する値のみを信頼する。
// タブ/デバイスをまたいだ多重付与を防ぐための対策の詳細は
// supabase/migrations/20260730120000_fix_timer_duplicate_reward.sql を参照。
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
    ) {
      return null;
    }
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

interface ServerTimerState {
  isRunning: boolean;
  // サーバー時計を基準にした開始時刻（エポックms）。stop中はnull。
  startedAtMs: number | null;
  accumulatedMs: number;
  awardedCount: number;
  intervalMinutes: number;
  // サーバー時刻とこの端末の時計のズレ（サーバー時刻 - 端末時刻）。
  // 端末の時計が狂っていても、経過時間の表示・判定はサーバー基準に揃える。
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

interface TimerSessionRpcRow {
  is_running: boolean;
  started_at: string | null;
  accumulated_ms: number;
  awarded_count: number;
  interval_minutes: number;
  elapsed_ms: number;
  strawberry_count: number;
  server_now: string;
}

const toServerState = (row: TimerSessionRpcRow): ServerTimerState => {
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

  const continueInBackground = settings?.continue_in_background ?? false;
  const pointsTiming = settings?.points_timing ?? "realtime";

  // 学習者本人のみタイマーを操作できる（サーバー側のRPCでも role を検証している）。
  const learnerId = profile?.role === "learner" ? profile.id : null;

  const [serverState, setServerState] = useState<ServerTimerState>(() => {
    const cached = loadDisplayCache();
    if (!cached) return EMPTY_STATE;
    // キャッシュはあくまで表示の初期値。isRunning は必ず false から始め、
    // サーバーから実際の状態が届き次第それで上書きする
    // （動作中かどうかを端末のローカル状態だけで判断しない）。
    return {
      ...EMPTY_STATE,
      accumulatedMs: cached.accumulatedMs,
      awardedCount: cached.awardedCount,
    };
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [isSyncingPoints, setIsSyncingPoints] = useState(false);

  const latest = useRef({ serverState, continueInBackground });
  latest.current = { serverState, continueInBackground };

  const isSyncingRef = useRef(false);

  // 起動時にサーバー権威の状態を取得する。
  // 他のタブ/デバイスで既にタイマーが動いていれば、その状態がそのまま返る。
  useEffect(() => {
    if (!learnerId) return;
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

  // 他のタブ/他のデバイスでの開始・停止・付与をリアルタイムに反映する。
  // これにより「別タブで既に動いている」ことにこのタブも気づき、
  // 独立した別セッションを作らず同じ状態に追従できる。
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

  useEffect(() => {
    if (!serverState.isRunning) return;
    const id = setInterval(() => setNowTick(Date.now()), 500);
    return () => clearInterval(id);
  }, [serverState.isRunning]);

  // タイマー動作中は支援者側の設定変更をすぐに反映させない
  // （TimerSettingsContext 側の既存の挙動を維持する）。
  useEffect(() => {
    notifyTimerActive(serverState.isRunning);
  }, [serverState.isRunning, notifyTimerActive]);

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
  // 画面表示用の即時計算。実際に付与されるいちご数は必ずサーバー
  // (sync_timer_points / complete_timer_session の戻り値)を正とする。
  const strawberryCount = Math.floor(elapsedMs / intervalMs);
  const awardedCount = serverState.awardedCount;
  const pendingPoints = Math.max(0, strawberryCount - awardedCount);
  const msUntilNextStrawberry = Math.max(
    0,
    (strawberryCount + 1) * intervalMs - elapsedMs,
  );

  // タイマー作動中に貯まったいちごの個数を PWA アイコンの未読件数バッジとして表示する。
  // 停止中（isRunning === false）はバッジを消す。
  // Badging API 未対応のブラウザでは useAppBadge 内で何もしないため安全に呼び出せる。
  useAppBadge(serverState.isRunning ? strawberryCount : 0);

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
  }, [pointsTiming, learnerId, profile, updateProfileState]);

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
  }, [learnerId]);

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
  }, [learnerId]);

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
  }, [learnerId, profile, updateProfileState]);

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
