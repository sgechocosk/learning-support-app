import { useRef, useState } from "react";
import { Play, Pause, CheckCircle2, Heart } from "lucide-react";
import HerbariumFlask from "../components/timer/HerbariumFlask";
import { NumberStepper } from "../components/ui/NumberStepper";
import { ToggleSwitch } from "../components/ui/ToggleSwitch";
import { Modal } from "../components/ui/Modal";
import { useHaptic } from "../hooks/useHaptic";
import { useProfile } from "../hooks/useProfile";
import {
  MAX_INTERVAL_MINUTES,
  MIN_INTERVAL_MINUTES,
  useWorkTimer,
} from "../hooks/useWorkTimer";
import {
  useTimerSettings,
  DEFAULT_TIMER_SETTINGS,
} from "../hooks/useTimerSettings";
import type { TimerSettings } from "../types";

const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

export default function Timer() {
  const { profile, isLoading: isProfileLoading } = useProfile();

  if (isProfileLoading) {
    return <div className="w-full h-full max-w-md mx-auto p-8" />;
  }

  if (profile?.role === "supporter") {
    return <SupporterSettingsPanel />;
  }

  return <LearnerTimerPanel />;
}

function SupporterSettingsPanel() {
  const triggerHaptic = useHaptic();
  const { partnerName } = useProfile();
  const { settings, isLoading, updateSettings } = useTimerSettings();

  const current: Pick<
    TimerSettings,
    "interval_minutes" | "continue_in_background" | "points_timing"
  > = settings ?? {
    interval_minutes: DEFAULT_TIMER_SETTINGS.interval_minutes,
    continue_in_background: DEFAULT_TIMER_SETTINGS.continue_in_background,
    points_timing: DEFAULT_TIMER_SETTINGS.points_timing,
  };

  const timingOptions: {
    value: TimerSettings["points_timing"];
    label: string;
    desc: string;
  }[] = [
    {
      value: "realtime",
      label: "リアルタイム",
      desc: "いちごが貯まった瞬間に付与",
    },
    {
      value: "on_finish",
      label: "タイマー終了後",
      desc: "「完了」を確定した時にまとめて付与",
    },
  ];

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-5 px-4 py-4">
      <div>
        <h1 className="text-lg font-bold text-gray-700">タイマー設定</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          {partnerName ? `${partnerName}さん` : "学習者"}
          の作業タイマーの動作を設定します。学習者本人はここを編集できません。
        </p>
      </div>

      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-5">
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1">
            いちごが貯まる間隔
          </p>
          <p className="text-[11px] text-gray-400 mb-2">
            {MIN_INTERVAL_MINUTES}〜{MAX_INTERVAL_MINUTES}分の間で設定できます
          </p>
          <div className="flex items-center gap-2">
            <NumberStepper
              value={current.interval_minutes}
              onChange={(v) => {
                if (v === "") return;
                triggerHaptic();
                updateSettings({ interval_minutes: v });
              }}
              min={MIN_INTERVAL_MINUTES}
              max={MAX_INTERVAL_MINUTES}
              disabled={isLoading}
              accentClassName="border-sky-200 focus:ring-sky-300 hover:bg-sky-50 text-sky-600"
            />
            <span className="text-xs text-gray-400">分 / 1いちご</span>
          </div>
        </div>

        <div className="h-px bg-gray-100" />

        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-gray-500">
              バックグラウンドでも継続
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              オフ（デフォルト）: 画面を離れると自動でストップします
              <br />
              オン: 画面を離れていてもタイマーは止まりません
            </p>
          </div>
          <ToggleSwitch
            checked={current.continue_in_background}
            onChange={(v) => {
              triggerHaptic();
              updateSettings({ continue_in_background: v });
            }}
            disabled={isLoading}
            accentClassName="bg-sky-400"
          />
        </div>

        <div className="h-px bg-gray-100" />

        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">
            いちごの付与タイミング
          </p>
          <div className="flex flex-col gap-2">
            {timingOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={isLoading}
                onClick={() => {
                  triggerHaptic();
                  updateSettings({ points_timing: opt.value });
                }}
                className={`text-left px-3 py-2.5 rounded-xl border transition-colors disabled:opacity-50 ${
                  current.points_timing === opt.value
                    ? "border-sky-300 bg-sky-50"
                    : "border-gray-100 bg-white"
                }`}
              >
                <span
                  className={`text-sm font-bold ${
                    current.points_timing === opt.value
                      ? "text-sky-600"
                      : "text-gray-600"
                  }`}
                >
                  {opt.label}
                </span>
                <span className="block text-[11px] text-gray-400">
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>
          {current.points_timing === "on_finish" && (
            <p className="text-[11px] text-amber-500 mt-2">
              「タイマー終了後」の場合、学習者が完了ボタンを押して確認モーダルで決定した時点でいちごが確定します。
            </p>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2 px-1 text-gray-400">
        <Heart size={14} className="mt-0.5 shrink-0 text-rose-300" />
        <p className="text-[11px] leading-relaxed">
          この設定は{partnerName ? `${partnerName}さん` : "学習者"}
          の端末にも同期され、学習者側では「スタート」「ストップ」「完了」の操作のみが可能です。
        </p>
      </div>
    </div>
  );
}

function LearnerTimerPanel() {
  const triggerHaptic = useHaptic();
  const { isLoading: isSettingsLoading } = useTimerSettings();
  const {
    intervalMinutes,
    continueInBackground,
    pointsTiming,
    isRunning,
    elapsedMs,
    strawberryCount,
    pendingPoints,
    msUntilNextStrawberry,
    start,
    stop,
    completeSession,
  } = useWorkTimer();

  const [showComplete, setShowComplete] = useState(false);
  const wasRunningBeforeCompleteRef = useRef(false);

  const hasProgress = elapsedMs > 0 || strawberryCount > 0;

  const handleToggle = () => {
    triggerHaptic();
    if (isRunning) {
      stop();
    } else {
      start();
    }
  };

  const handleCompleteRequest = () => {
    triggerHaptic();
    if (!hasProgress) return;
    wasRunningBeforeCompleteRef.current = isRunning;
    if (isRunning) stop();
    setShowComplete(true);
  };

  const cancelComplete = () => {
    triggerHaptic();
    setShowComplete(false);
    if (wasRunningBeforeCompleteRef.current) {
      start();
    }
  };

  const confirmComplete = () => {
    triggerHaptic();
    completeSession();
    setShowComplete(false);
  };

  return (
    <div className="w-full h-full max-w-md mx-auto flex flex-col items-center justify-between pt-2 pb-6 px-4">
      <div className="flex flex-col items-center gap-1 mt-4">
        <p className="text-5xl font-mono font-bold text-sky-600 tabular-nums tracking-tight">
          {formatDuration(elapsedMs)}
        </p>
        <p className="text-sm text-gray-500 font-medium mt-1">
          次の🍓まで {formatDuration(msUntilNextStrawberry)}
        </p>
        {!isSettingsLoading && !continueInBackground && (
          <p className="text-[11px] text-gray-300">
            画面を離れるとストップします
          </p>
        )}
      </div>

      <div className="flex-1 w-full flex items-center justify-center min-h-0 my-4">
        <HerbariumFlask
          count={strawberryCount}
          intervalMinutes={intervalMinutes}
          glassColorHex="#fb7185"
          width={320}
          height={400}
        />
      </div>

      <div className="w-full flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={handleCompleteRequest}
          disabled={!hasProgress}
          className="w-14 h-14 flex items-center justify-center rounded-full bg-white border border-gray-200 text-emerald-400 shadow-sm active:scale-95 transition-transform disabled:opacity-40 disabled:active:scale-100"
          aria-label="完了"
        >
          <CheckCircle2 size={24} />
        </button>

        <button
          type="button"
          onClick={handleToggle}
          className={`w-20 h-20 flex items-center justify-center rounded-full shadow-lg text-white active:scale-95 transition-transform ${
            isRunning
              ? "bg-amber-400 active:bg-amber-500"
              : "bg-sky-400 active:bg-sky-500"
          }`}
          aria-label={isRunning ? "ストップ" : "スタート"}
        >
          {isRunning ? (
            <Pause size={32} fill="currentColor" />
          ) : (
            <Play size={32} fill="currentColor" className="ml-1" />
          )}
        </button>

        <div className="w-14 h-14 flex flex-col items-center justify-center">
          {pointsTiming === "on_finish" && pendingPoints > 0 && (
            <span className="text-[11px] font-bold text-amber-500 whitespace-nowrap">
              未確定:{pendingPoints}コ
            </span>
          )}
        </div>
      </div>

      <Modal
        isOpen={showComplete}
        onClose={cancelComplete}
        contentClassName="w-full max-w-xs rounded-3xl p-6"
      >
        <h2 className="text-base font-bold text-gray-700 mb-1">
          完了しますか？
        </h2>
        <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-1 mb-4 mt-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">今回の経過時間</span>
            <span className="font-bold text-sky-600 font-mono">
              {formatDuration(elapsedMs)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">いちごの合計</span>
            <span className="font-bold text-rose-500">
              🍓 {strawberryCount} 個
            </span>
          </div>
          {pointsTiming === "on_finish" && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">付与いちご</span>
              <span className="font-bold text-amber-500">+{pendingPoints}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={cancelComplete}
            className="flex-1 py-2.5 rounded-full bg-gray-100 text-gray-600 font-bold text-sm active:scale-95 transition-transform"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={confirmComplete}
            className="flex-1 py-2.5 rounded-full bg-emerald-400 text-white font-bold text-sm active:scale-95 transition-transform"
          >
            完了する
          </button>
        </div>
      </Modal>
    </div>
  );
}
