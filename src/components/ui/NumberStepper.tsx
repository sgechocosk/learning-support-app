import { ChevronsLeft, ChevronsRight, Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

interface NumberStepperProps {
  value: number | "";
  onChange: (value: number | "") => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  accentClassName?: string;
  size?: "sm" | "md";
}

// 長押し対応: タップで1回、押しっぱなしで400ms後から120ms間隔で連続加算/減算する。
const LONG_PRESS_DELAY_MS = 400;
const LONG_PRESS_INTERVAL_MS = 120;

// 入力欄の左右に±1ボタン、その外側に±5ボタンを配置した数値調整UI。
// 例: [-5] [-1] [ 入力欄 ] [+1] [+5]
// ±ボタンは長押しで連続加算/減算に対応（大きな数値をすばやく調整できる）。
export const NumberStepper = ({
  value,
  onChange,
  min,
  max,
  disabled = false,
  accentClassName = "border-amber-200 focus:ring-amber-300 hover:bg-amber-50 text-amber-600",
  size = "md",
}: NumberStepperProps) => {
  // 長押し中の setInterval コールバックが常に最新の値を参照できるよう ref で保持する
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clamp = useCallback(
    (n: number) => {
      let v = n;
      if (min !== undefined) v = Math.max(min, v);
      if (max !== undefined) v = Math.min(max, v);
      return v;
    },
    [min, max],
  );

  const step = useCallback(
    (delta: number) => {
      const current = valueRef.current === "" ? (min ?? 0) : valueRef.current;
      const next = clamp(current + delta);
      valueRef.current = next;
      onChange(next);
    },
    [clamp, min, onChange],
  );

  const canStep = (delta: number) => {
    if (disabled) return false;
    const current = value === "" ? (min ?? 0) : value;
    const next = clamp(current + delta);
    return next !== current || value === "";
  };

  // 長押し用タイマーを確実に停止する
  const stopPress = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ボタンが押された瞬間に1回分を反映し、400ms長押しが続いたら120ms間隔の連続入力を開始する
  const startPress = useCallback(
    (delta: number) => {
      if (disabled) return;
      stopPress();
      step(delta);
      timeoutRef.current = setTimeout(() => {
        intervalRef.current = setInterval(() => {
          step(delta);
        }, LONG_PRESS_INTERVAL_MS);
      }, LONG_PRESS_DELAY_MS);
    },
    [disabled, step, stopPress],
  );

  // コンポーネント破棄時にタイマーを確実にクリア
  useEffect(() => stopPress, [stopPress]);

  // iOS Safariはtouchstart/touchendの後、約300ms遅れて互換用のmousedown/mouseup/click
  // (synthetic mouse events)を発火させる。React 17以降 onTouchStart はpassiveリスナーとして
  // 登録されるため、ここでの e.preventDefault() はこの合成イベントの発生を止められない。
  // 何もガードしないと「タッチ本来の1回」+「後から来る合成mousedownの1回」で
  // 1タップが2回分の加算/減算として処理されてしまう。
  // そのため、直近にタッチ操作があった場合は、その後一定時間だけ
  // mousedown由来のstartPressを無視する。
  const IGNORE_MOUSE_AFTER_TOUCH_MS = 1000;
  const ignoreMouseUntilRef = useRef(0);

  // マウスとタッチ両方のイベントをまとめるヘルパー関数。
  // touch-none と組み合わせることで、スマホでの誤スクロールや長押しメニューの発生を防ぐ。
  const pressHandlers = (delta: number) => ({
    onMouseDown: () => {
      if (Date.now() < ignoreMouseUntilRef.current) return;
      startPress(delta);
    },
    onMouseUp: stopPress,
    onMouseLeave: stopPress,
    onTouchStart: (e: React.TouchEvent) => {
      e.preventDefault();
      ignoreMouseUntilRef.current = Date.now() + IGNORE_MOUSE_AFTER_TOUCH_MS;
      startPress(delta);
    },
    onTouchEnd: stopPress,
    onTouchCancel: stopPress,
  });

  const btnBase =
    size === "sm"
      ? "w-7 h-7 shrink-0 flex items-center justify-center rounded-full border text-xs font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed select-none touch-none"
      : "w-9 h-9 shrink-0 flex items-center justify-center rounded-full border text-sm font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed select-none touch-none";

  const inputBase =
    size === "sm"
      ? "w-14 border rounded-lg px-1 py-1 text-sm text-center focus:outline-none focus:ring-2"
      : "w-16 border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2";

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        {...pressHandlers(-5)}
        disabled={!canStep(-5)}
        aria-label="5減らす（長押しで連続減算）"
        className={`${btnBase} ${accentClassName}`}
      >
        <ChevronsLeft size={size === "sm" ? 16 : 18} />
      </button>
      <button
        type="button"
        {...pressHandlers(-1)}
        disabled={!canStep(-1)}
        aria-label="1減らす（長押しで連続減算）"
        className={`${btnBase} ${accentClassName}`}
      >
        <Minus size={size === "sm" ? 12 : 14} />
      </button>

      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const val = e.target.value;
          if (val === "") {
            onChange("");
            return;
          }
          const num = Number(val);
          if (Number.isNaN(num)) return;
          onChange(num);
        }}
        onBlur={() => {
          if (value === "") return;
          onChange(clamp(value));
        }}
        className={`${inputBase} ${accentClassName} disabled:opacity-50 disabled:bg-slate-50`}
      />

      <button
        type="button"
        {...pressHandlers(1)}
        disabled={!canStep(1)}
        aria-label="1増やす（長押しで連続加算）"
        className={`${btnBase} ${accentClassName}`}
      >
        <Plus size={size === "sm" ? 12 : 14} />
      </button>
      <button
        type="button"
        {...pressHandlers(5)}
        disabled={!canStep(5)}
        aria-label="5増やす（長押しで連続加算）"
        className={`${btnBase} ${accentClassName}`}
      >
        <ChevronsRight size={size === "sm" ? 16 : 18} />
      </button>
    </div>
  );
};
