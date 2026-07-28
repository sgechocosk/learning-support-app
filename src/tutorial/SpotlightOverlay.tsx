import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ArrowRight, ArrowLeft, Hand } from "lucide-react";
import type { TutorialRect } from "./useTutorialEngine";
import type { TutorialPlacement } from "./types";

const PORTAL_ROOT_ID = "modal-portal-root";
const SPOTLIGHT_PADDING = 8;
const TOOLTIP_WIDTH = 300;

interface SpotlightOverlayProps {
  rect: TutorialRect | null;
  placement: TutorialPlacement;
  title: string;
  body: string;
  hint?: string;
  isInteractive: boolean;
  stepIndex: number;
  totalSteps: number;
  isLast: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

export const SpotlightOverlay = ({
  rect,
  placement,
  title,
  body,
  hint,
  isInteractive,
  stepIndex,
  totalSteps,
  isLast,
  onNext,
  onPrev,
  onSkip,
}: SpotlightOverlayProps) => {
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useLayoutEffect(() => {
    const onResize = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const portalRoot = document.getElementById(PORTAL_ROOT_ID);
  if (!portalRoot) return null;

  const showSpotlight = !!rect && placement !== "center";

  const spotlightStyle = showSpotlight
    ? {
        top: rect!.top - SPOTLIGHT_PADDING,
        left: rect!.left - SPOTLIGHT_PADDING,
        width: rect!.width + SPOTLIGHT_PADDING * 2,
        height: rect!.height + SPOTLIGHT_PADDING * 2,
      }
    : null;

  // ツールチップの位置を計算（画面外にはみ出さないように補正）
  let tooltipStyle: React.CSSProperties;
  if (!showSpotlight || !spotlightStyle) {
    tooltipStyle = {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  } else {
    const preferBelow =
      placement === "bottom" || spotlightStyle.top < viewport.height / 2;
    const rawLeft = Math.min(
      Math.max(
        spotlightStyle.left + spotlightStyle.width / 2 - TOOLTIP_WIDTH / 2,
        12,
      ),
      viewport.width - TOOLTIP_WIDTH - 12,
    );

    if (preferBelow) {
      tooltipStyle = {
        top: spotlightStyle.top + spotlightStyle.height + 14,
        left: rawLeft,
      };
    } else {
      tooltipStyle = {
        top: undefined,
        bottom: viewport.height - spotlightStyle.top + 14,
        left: rawLeft,
      };
    }
  }

  const content = (
    <div
      className="fixed inset-0 z-[60]"
      style={{ pointerEvents: "none" }}
      aria-live="polite"
    >
      {/* 暗転レイヤー：対象要素の周りだけ box-shadow で穴を開ける演出。
          pointer-events は無効化しているので、実際の操作を妨げない。 */}
      {showSpotlight && spotlightStyle ? (
        <div
          className="absolute rounded-2xl transition-all duration-200 ease-out animate-pulse-ring"
          style={{
            ...spotlightStyle,
            boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.55)",
            border: "3px solid #38bdf8",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-900/55" />
      )}

      <style>{`
        @keyframes tutorial-pulse-ring {
          0%, 100% { box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.55), 0 0 0 0 rgba(56, 189, 248, 0.5); }
          50% { box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.55), 0 0 0 6px rgba(56, 189, 248, 0.15); }
        }
        .animate-pulse-ring { animation: tutorial-pulse-ring 1.6s ease-in-out infinite; }
      `}</style>

      {/* ツールチップカード */}
      <div
        className="absolute bg-white rounded-2xl shadow-2xl p-4 flex flex-col gap-2 border border-sky-100"
        style={{
          ...tooltipStyle,
          width: TOOLTIP_WIDTH,
          pointerEvents: "auto",
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-black text-sky-800 text-sm leading-snug">
            {title}
          </h4>
          <button
            type="button"
            onClick={onSkip}
            className="shrink-0 p-1 rounded-full text-slate-400 hover:bg-slate-100"
            aria-label="チュートリアルを終了"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">{body}</p>

        {isInteractive && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 bg-amber-50 rounded-lg px-2 py-1.5 w-fit">
            <Hand size={13} className="animate-bounce" />
            {hint ?? "画面を操作して次へ進もう"}
          </div>
        )}

        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === stepIndex ? "w-4 bg-sky-400" : "w-1.5 bg-sky-100"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={onPrev}
                className="p-1.5 rounded-full text-sky-400 hover:bg-sky-50"
                aria-label="前へ"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            {!isInteractive && (
              <button
                type="button"
                onClick={onNext}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-sky-400 text-white rounded-full hover:bg-sky-500"
              >
                {isLast ? "はじめる" : "次へ"}
                {!isLast && <ArrowRight size={13} />}
              </button>
            )}
          </div>
        </div>

        {isInteractive && (
          <button
            type="button"
            onClick={onSkip}
            className="self-center text-[11px] text-slate-400 underline underline-offset-2"
          >
            チュートリアルをスキップ
          </button>
        )}
      </div>
    </div>
  );

  return createPortal(content, portalRoot);
};
