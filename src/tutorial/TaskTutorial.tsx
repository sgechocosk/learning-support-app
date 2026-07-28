import { useCallback, useEffect, useState } from "react";
import { useTutorialEngine } from "./useTutorialEngine";
import { SpotlightOverlay } from "./SpotlightOverlay";
import type { TutorialRole, TutorialStep } from "./types";

const storageKey = (tutorialId: string, role: TutorialRole) =>
  `tutorial_${tutorialId}_done_${role}`;

interface TaskTutorialProps {
  role: TutorialRole;
  // 表示するステップ一覧（画面ごとに異なる）
  steps: TutorialStep[];
  // どの画面のチュートリアルかを区別するID（既読状態を画面ごとに管理するため）
  tutorialId?: string;
  // このチュートリアルを提供してよい状態かどうか
  // （例：タスク画面では説明対象のタスクが実際に存在する場合のみ表示する）
  enabled?: boolean;
}

// タスク・タイマー画面のチュートリアル本体。
// 初回訪問時に自動で開始し、一度最後まで進める（またはスキップする）と
// 二度と表示されない（一度きり）。既読フラグは画面・role ごとに
// localStorage で管理する。
export const TaskTutorial = ({
  role,
  steps,
  tutorialId = "task",
  enabled = true,
}: TaskTutorialProps) => {
  const [running, setRunning] = useState(false);

  // このコンポーネントは学習者向けにのみ使用する（支援者向けは
  // TutorialFieldHint / TutorialNote による吹き出し形式に置き換え済み）。
  const shouldOffer = enabled;

  useEffect(() => {
    if (!shouldOffer) return;
    const done = localStorage.getItem(storageKey(tutorialId, role)) === "true";
    if (!done) {
      // 画面のマウント・描画が落ち着いてから開始する
      const t = window.setTimeout(() => setRunning(true), 400);
      return () => window.clearTimeout(t);
    }
  }, [role, shouldOffer, tutorialId]);

  const finish = useCallback(() => {
    setRunning(false);
    localStorage.setItem(storageKey(tutorialId, role), "true");
  }, [role, tutorialId]);

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
      key={step.id}
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
};
