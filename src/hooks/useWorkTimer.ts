import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useProfile } from "./useProfile";
import { useTimerSettings } from "./useTimerSettings";

const STORAGE_KEY = "app_timer_session_v2";

export const MIN_INTERVAL_MINUTES = 1;
export const MAX_INTERVAL_MINUTES = 10;

interface StoredSessionState {
  priorLifetimeMs: number; // 完了済みセッションの合計作業時間（ジャー算出のベース）
  accumulatedMs: number; // 現在のセッションで一時停止までに貯まった時間
  runningSince: number | null; // Date.now() のタイムスタンプ。停止中は null
  strawberryCount: number; // これまでに獲得したいちご（＝ポイント）の総数
  awardedCount: number; // このうち、既にポイントとして確定付与済みの数
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
  } catch {
    // localStorage が使えない環境では無視する
  }
};

// サーバー側（Supabase の RPC）にいちご分のポイント加算を依頼する。
const requestAwardPoints = async (amount: number) => {
  if (amount <= 0) return;
  try {
    const { error } = await supabase.rpc("award_timer_points", {
      points: amount,
    });
    if (error) {
      console.warn("いちごポイントの反映に失敗しました", error);
    }
  } catch (e) {
    console.warn("いちごポイントの反映に失敗しました", e);
  }
};

// 作業タイマーの経過時間を管理し、設定した分数が経過するごとに
// いちご（＝ポイント）を1つ獲得する。
//
// 設定（分数・バックグラウンド継続・ポイント付与タイミング）は
// TimerSettingsContext（支援者が編集、Supabase の pair 単位で共有）から取得する。
// 学習者はここでは「スタート／ストップ／完了」の3操作のみを行う。
export const useWorkTimer = () => {
  const { profile, updateProfileState } = useProfile();
  const { settings } = useTimerSettings();

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

  // 最新値を effect / イベントリスナー / アンマウント時のクリーンアップから
  // 参照するための ref（クロージャの古い値を掴まないようにする）
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

  // 実行中は定期的に現在時刻を更新して経過時間を再計算する
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setNowTick(Date.now()), 500);
    return () => clearInterval(id);
  }, [isRunning]);

  // 現在のセッションの経過時間（「完了」を押すと 0 に戻る）
  const sessionElapsedMs =
    accumulatedMs +
    (isRunning ? Math.max(0, nowTick - (runningSince as number)) : 0);

  // ジャー（いちご）の計算に使う、これまでの作業時間の累計
  const lifetimeElapsedMs = priorLifetimeMs + sessionElapsedMs;

  const intervalMs = intervalMinutes * 60 * 1000;

  // しきい値を超えたらいちごを加算する（累計時間ベースなのでセッションをまたいでも減らない）
  useEffect(() => {
    const earned = Math.floor(lifetimeElapsedMs / intervalMs);
    if (earned > strawberryCount) {
      setStrawberryCount(earned);
    }
  }, [lifetimeElapsedMs, intervalMs, strawberryCount]);

  // ポイント付与：リアルタイム設定なら、いちごが増えるたびに即時付与する
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

  // 状態が変わるたびに保存する
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

  // ストップ：一時停止するだけ。ポイントの確定は行わない
  const stop = useCallback(() => {
    setRunningSince((prev) => {
      if (prev === null) return prev;
      setAccumulatedMs((acc) => acc + Math.max(0, Date.now() - prev));
      return null;
    });
  }, []);

  // 完了：学習者が確認モーダルで決定した後に呼び出す。
  // - 実行中なら時間を確定させる
  // - 「タイマー終了後」設定なら、ここで初めて未確定のポイントをまとめて付与する
  // - 現在のセッションの経過時間はジャーの合計に繰り入れたうえで 0 に戻す
  //   （いちごの数＝ジャーの中身は累計なので減らない）
  const completeSession = useCallback(() => {
    const since = latest.current.runningSince;
    const finalAccumulated =
      latest.current.accumulatedMs +
      (since !== null ? Math.max(0, Date.now() - since) : 0);

    setRunningSince(null);
    setAccumulatedMs(0);
    setPriorLifetimeMs((prior) => prior + finalAccumulated);

    if (pointsTiming === "on_finish") {
      const finalStrawberries = Math.floor(
        (latest.current.priorLifetimeMs + finalAccumulated) / intervalMs,
      );
      const pending =
        Math.max(finalStrawberries, latest.current.strawberryCount) -
        latest.current.awardedCount;
      if (pending > 0) {
        setAwardedCount(
          Math.max(finalStrawberries, latest.current.strawberryCount),
        );
        if (profile) {
          updateProfileState({
            points: profile.points + pending,
            total_points: profile.total_points + pending,
          });
        }
        requestAwardPoints(pending);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsTiming, intervalMs, profile]);

  // バックグラウンド継続がオフの場合、ブラウザタブの非表示化や
  // アプリが閉じられるタイミングで自動的に一時停止する
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

  // ボトムナビでこの画面から離れる（＝このコンポーネントがアンマウントされる）
  // タイミングでも、バックグラウンド継続がオフなら一時停止する。
  // アンマウント後は setState できないため、localStorage へ直接書き込む。
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
