interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  accentClassName?: string;
}

// シンプルなオン/オフのトグルスイッチ。ラベルを右側に添えて状態を伝える。
export const ToggleSwitch = ({
  checked,
  onChange,
  label,
  disabled = false,
  accentClassName = "bg-amber-400",
}: ToggleSwitchProps) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 disabled:opacity-50"
    >
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? accentClassName : "bg-slate-200"
        }`}
      >
        <span
          className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
          style={{
            transform: checked ? "translateX(18px)" : "translateX(2px)",
          }}
        />
      </span>
      {label && (
        <span className="text-xs font-semibold text-amber-700">{label}</span>
      )}
    </button>
  );
};
