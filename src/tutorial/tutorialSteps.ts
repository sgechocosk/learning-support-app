import type { TutorialStep } from "./types";

// 学習者向け：タスク画面チュートリアル（スポットライト形式）
// タスクが実際に存在する場合のみ、「完了のしかた」と「いちごの受け取りかた」だけを説明する。
// ウェルカム画面や完了画面などの説明目的だけのステップは置かず、
// 操作を強制せず「次へ」でいつでも読み飛ばせるようにする。
//
// 支援者向けの説明は、フォーム各項目にフォーカスした際に表示される
// 吹き出し（TutorialFieldHint）に置き換えたため、ここには存在しない。
export const learnerTutorialSteps: TutorialStep[] = [
  {
    id: "task-card",
    targetId: "tutorial-task-card",
    title: "タスクを完了したら",
    body: "左側をタップして、タスクを「完了」にできます。",
    placement: "bottom",
    condition: { type: "auto" },
    optionalIfMissing: true,
  },
  {
    id: "reward-stub",
    targetId: "tutorial-reward-stub",
    title: "いちごを受け取る",
    body: "タスクを完了すると、右側をタップして「いちご」をゲット！",
    placement: "bottom",
    condition: { type: "auto" },
    optionalIfMissing: true,
  },
];

export const getTutorialSteps = (): TutorialStep[] => learnerTutorialSteps;
