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

// 学習者向け：タイマー画面チュートリアル（スポットライト形式）
// 画面に表示される数字（経過時間・次のいちごまでの時間）や、
// ボタン（完了・スタート/ストップ）の意味を順番に説明する。
export const timerTutorialSteps: TutorialStep[] = [
  {
    id: "timer-elapsed",
    targetId: "tutorial-timer-elapsed",
    title: "作業タイマー",
    body: "ここには、スタートしてからがんばった時間が表示されます。",
    placement: "bottom",
    condition: { type: "auto" },
    optionalIfMissing: true,
  },
  {
    id: "timer-next-strawberry",
    targetId: "tutorial-timer-next-strawberry",
    title: "作業でいちごゲット！",
    body: "どれくらいで次の「いちご」がもらえるかが分かります。",
    placement: "bottom",
    condition: { type: "auto" },
    optionalIfMissing: true,
  },
  {
    id: "timer-flask",
    targetId: "tutorial-timer-flask",
    title: "いちごをためる",
    body: "がんばった時間の分だけ、いちごが増えていきます。",
    placement: "top",
    condition: { type: "auto" },
    optionalIfMissing: true,
  },
  {
    id: "timer-toggle-button",
    targetId: "tutorial-timer-toggle-button",
    title: "スタート／ストップボタン",
    body: "ここを押すとタイマーをスタート、ストップします。",
    placement: "top",
    condition: { type: "auto" },
    optionalIfMissing: true,
  },
  {
    id: "timer-complete-button",
    targetId: "tutorial-timer-complete-button",
    title: "完了ボタン",
    body: "がんばり終わったら、忘れずここを押して「完了」にしよう！",
    placement: "top",
    condition: { type: "auto" },
    optionalIfMissing: true,
  },
];
