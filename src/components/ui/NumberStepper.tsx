import { Minus, Plus } from "lucide-react";

interface NumberStepperProps {
  value: number | "";
  onChange: (value: number | "") => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  accentClassName?: string;
  size?: "sm" | "md";
}

// 入力欄の左右に±1ボタン、その外側に±5ボタンを配置した数値調整UI。
// 例: [-5] [-1] [ 入力欄 ] [+1] [+5]
export const NumberStepper = ({
  value,
  onChange,
  min,
  max,
  disabled = false,
  accentClassName = "border-amber-200 focus:ring-amber-300 hover:bg-amber-50 text-amber-600",
  size = "md",
}: NumberStepperProps) => {
  const clamp = (n: number) => {
    let v = n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return v;
  };

  const step = (delta: number) => {
    const current = value === "" ? (min ?? 0) : value;
    onChange(clamp(current + delta));
  };

  const canStep = (delta: number) => {
    if (disabled) return false;
    const current = value === "" ? (min ?? 0) : value;
    const next = clamp(current + delta);
    return next !== current || value === "";
  };

  const btnBase =
    size === "sm"
      ? "w-7 h-7 shrink-0 flex items-center justify-center rounded-full border text-xs font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      : "w-9 h-9 shrink-0 flex items-center justify-center rounded-full border text-sm font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed";

  const inputBase =
    size === "sm"
      ? "w-14 border rounded-lg px-1 py-1 text-sm text-center focus:outline-none focus:ring-2"
      : "w-16 border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2";

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => step(-5)}
        disabled={!canStep(-5)}
        aria-label="5減らす"
        className={`${btnBase} ${accentClassName}`}
      >
        <span className="flex items-center">
          <Minus size={11} />
          <Minus size={11} className="-ml-1.5" />
        </span>
      </button>
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={!canStep(-1)}
        aria-label="1減らす"
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
        onClick={() => step(1)}
        disabled={!canStep(1)}
        aria-label="1増やす"
        className={`${btnBase} ${accentClassName}`}
      >
        <Plus size={size === "sm" ? 12 : 14} />
      </button>
      <button
        type="button"
        onClick={() => step(5)}
        disabled={!canStep(5)}
        aria-label="5増やす"
        className={`${btnBase} ${accentClassName}`}
      >
        <span className="flex items-center">
          <Plus size={11} />
          <Plus size={11} className="-ml-1.5" />
        </span>
      </button>
    </div>
  );
};
