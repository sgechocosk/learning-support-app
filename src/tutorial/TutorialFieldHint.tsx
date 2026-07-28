import { useState } from "react";
import type { ReactNode } from "react";
import { useSupporterTutorialContext } from "./SupporterTutorialContext";

interface TutorialFieldHintProps {
  text: string;
  placement?: "top" | "bottom";
  className?: string;
  children: ReactNode;
}

// フォーム項目をラップし、その項目にフォーカスが当たっている間だけ
// 簡単な説明を吹き出しで表示する。スポットライトのように画面全体を覆ったり
// 操作を待たせたりしないため、支援者の好きなタイミングで見比べながら進められる。
export const TutorialFieldHint = ({
  text,
  placement = "bottom",
  className,
  children,
}: TutorialFieldHintProps) => {
  const { active } = useSupporterTutorialContext();
  const [focused, setFocused] = useState(false);
  // 「閉じる」で吹き出しだけを閉じた状態（tutorial_task_done_supporter は変更しない）
  const [closed, setClosed] = useState(false);

  if (!active) return <>{children}</>;

  return (
    <div
      className={`relative ${className ?? ""}`}
      // React の focus/blur はバブリングするため、ラップした要素内の
      // どの子要素（input・button等）にフォーカスが当たっても検知できる
      onFocus={() => {
        setFocused(true);
        setClosed(false);
      }}
      onBlur={() => setFocused(false)}
    >
      {children}

      {focused && !closed && (
        <div
          className={`absolute z-50 left-0 w-64 max-w-[80vw] bg-white border border-sky-100 shadow-xl rounded-xl p-3 flex flex-col gap-2 animate-in fade-in duration-150 ${
            placement === "bottom" ? "top-full mt-2" : "bottom-full mb-2"
          }`}
        >
          <span
            className={`absolute left-4 w-2.5 h-2.5 bg-white rotate-45 border-sky-100 ${
              placement === "bottom"
                ? "-top-1.5 border-l border-t"
                : "-bottom-1.5 border-r border-b"
            }`}
          />
          <p className="text-xs text-slate-600 leading-relaxed">{text}</p>
          <button
            type="button"
            // mousedown時にフォーカス移動を止めることで、クリックの瞬間に
            // 入力欄がblurして吹き出しが先に消えてしまうのを防ぐ
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setClosed(true)}
            className="self-end text-[11px] text-sky-400 underline underline-offset-2"
          >
            閉じる
          </button>
        </div>
      )}
    </div>
  );
};
