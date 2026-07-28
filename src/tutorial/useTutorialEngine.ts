import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import type { TutorialStep } from "./types";

export interface TutorialRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const getTargetEl = (targetId?: string) =>
  targetId
    ? (document.querySelector(
        `[data-tutorial-id="${targetId}"]`,
      ) as HTMLElement | null)
    : null;

const rectOf = (el: HTMLElement): TutorialRect => {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
};

const POLL_MS = 250;
const MISSING_TIMEOUT_MS = 2500;

interface UseTutorialEngineOptions {
  steps: TutorialStep[];
  active: boolean;
  onFinish: () => void;
}

export const useTutorialEngine = ({
  steps,
  active,
  onFinish,
}: UseTutorialEngineOptions) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<TutorialRect | null>(null);
  const [targetMissing, setTargetMissing] = useState(false);

  const step = steps[stepIndex];

  const next = useCallback(() => {
    // 最終ステップでは stepIndex を steps.length まで進める。
    // これにより下の useEffect が発火し、チュートリアルが確実に終了する。
    setStepIndex((i) => Math.min(i + 1, steps.length));
  }, [steps.length]);

  const prev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const skipAll = useCallback(() => {
    onFinish();
  }, [onFinish]);

  // ステップが最終ステップを超えたら終了通知
  useEffect(() => {
    if (!active) return;
    if (stepIndex >= steps.length) {
      onFinish();
    }
  }, [stepIndex, steps.length, active, onFinish]);

  // ステップ切り替え時、ブラウザが描画する前に対象要素の位置を同期的に確定する。
  // useEffect（非同期）で行うと、一瞬「中央寄せ」の状態が描画されてから
  // 正しい位置へジャンプしてしまい、かくかくした動きに見えるため、
  // useLayoutEffect でペイント前に確定させる。
  useLayoutEffect(() => {
    if (!active || !step) {
      setRect(null);
      setTargetMissing(false);
      return;
    }
    const el = getTargetEl(step.targetId);
    setRect(el ? rectOf(el) : null);
    setTargetMissing(false);
  }, [stepIndex, active, step]);

  // 対象要素の位置を追従し、出現・消失・入力・クリックの条件を監視する
  useEffect(() => {
    if (!active || !step) return;

    let cancelled = false;
    const startedAt = Date.now();
    const existedAtStart = step.targetId ? !!getTargetEl(step.targetId) : false;

    let clickCleanup: (() => void) | null = null;
    if (step.condition.type === "click") {
      const targetId = step.condition.targetId ?? step.targetId;
      const el = getTargetEl(targetId);
      if (el) {
        const handler = () => {
          if (!cancelled) next();
        };
        el.addEventListener("click", handler, { once: true });
        clickCleanup = () => el.removeEventListener("click", handler);
      }
    }

    const interval = window.setInterval(() => {
      if (cancelled) return;

      const el = getTargetEl(step.targetId);

      if (el) {
        setRect(rectOf(el));
        setTargetMissing(false);
      } else {
        setRect(null);
        if (
          step.targetId &&
          step.optionalIfMissing &&
          Date.now() - startedAt > MISSING_TIMEOUT_MS
        ) {
          setTargetMissing(true);
        }
      }

      const conditionTargetId = step.condition.targetId ?? step.targetId;
      switch (step.condition.type) {
        case "input": {
          const inputEl = getTargetEl(conditionTargetId) as
            | HTMLInputElement
            | HTMLTextAreaElement
            | null;
          if (
            inputEl &&
            "value" in inputEl &&
            inputEl.value.trim().length > 0
          ) {
            next();
          }
          break;
        }
        case "appear": {
          const appeared = getTargetEl(conditionTargetId);
          if (!existedAtStart && appeared) {
            next();
          }
          break;
        }
        case "disappear": {
          const stillThere = getTargetEl(conditionTargetId);
          if (existedAtStart && !stillThere) {
            next();
          }
          break;
        }
        default:
          break;
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      if (clickCleanup) clickCleanup();
    };
  }, [active, step, next]);

  // 対象が最後まで見つからない場合は自動的に読み飛ばす（フラストレーション防止）
  useEffect(() => {
    if (targetMissing) next();
  }, [targetMissing, next]);

  return {
    step,
    stepIndex,
    totalSteps: steps.length,
    rect,
    next,
    prev,
    skipAll,
    isLast: stepIndex >= steps.length - 1,
  };
};
