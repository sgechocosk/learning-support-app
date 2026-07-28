import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { getTutorialSteps } from "./tutorialSteps";
import { useTutorialEngine } from "./useTutorialEngine";
import { SpotlightOverlay } from "./SpotlightOverlay";
import type { TutorialRole } from "./types";

export interface TaskTutorialHandle {
  restart: () => void;
}

const storageKey = (role: TutorialRole) => `tutorial_task_done_${role}`;

interface TaskTutorialProps {
  role: TutorialRole;
  // 学習者向けチュートリアルは、説明対象のタスクが実際に存在する場合のみ表示する。
  // （支援者向けはタスクの有無に関わらず案内する）
  hasTasks?: boolean;
}

// タスク画面のチュートリアル本体。
// 初回訪問時に自動で開始し、右上の「？」ボタン（TaskTutorialHelpButton）から
// いつでも再開できる。既読フラグは role ごとに localStorage で管理する。
export const TaskTutorial = forwardRef<TaskTutorialHandle, TaskTutorialProps>(
  ({ role, hasTasks = true }, ref) => {
    const [running, setRunning] = useState(false);
    const [runKey, setRunKey] = useState(0);

    // このコンポーネントは学習者向けにのみ使用する（支援者向けは
    // TutorialFieldHint による吹き出し形式に置き換え済み）。
    const shouldOffer = hasTasks;

    useEffect(() => {
      if (!shouldOffer) return;
      const done = localStorage.getItem(storageKey(role)) === "true";
      if (!done) {
        // 画面のマウント・描画が落ち着いてから開始する
        const t = window.setTimeout(() => setRunning(true), 400);
        return () => window.clearTimeout(t);
      }
    }, [role, shouldOffer]);

    const finish = useCallback(() => {
      setRunning(false);
      localStorage.setItem(storageKey(role), "true");
    }, [role]);

    useImperativeHandle(ref, () => ({
      restart: () => {
        if (!shouldOffer) return;
        setRunKey((k) => k + 1);
        setRunning(true);
      },
    }));

    const steps = getTutorialSteps();
    const { step, stepIndex, totalSteps, rect, next, prev, skipAll, isLast } =
      useTutorialEngine({
        steps,
        active: running,
        onFinish: finish,
      });

    if (!running || !step) return null;

    const isInteractive = step.condition.type !== "auto";

    return (
      <SpotlightOverlay
        key={`${runKey}-${step.id}`}
        rect={step.targetId ? rect : null}
        placement={step.placement ?? "bottom"}
        title={step.title}
        body={step.body}
        hint={step.hint}
        isInteractive={isInteractive}
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        isLast={isLast}
        onNext={next}
        onPrev={prev}
        onSkip={skipAll}
      />
    );
  },
);

TaskTutorial.displayName = "TaskTutorial";
