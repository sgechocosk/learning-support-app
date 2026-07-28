// タスク画面チュートリアル用の型定義

export type TutorialConditionType =
  | "auto" // 「次へ」ボタンで進む（説明のみのステップ）
  | "click" // 対象要素をタップしたら進む
  | "input" // 対象の入力欄に文字が入力されたら進む
  | "appear" // ステップ開始時に無かった対象要素が出現したら進む
  | "disappear"; // ステップ開始時にあった対象要素が消えたら進む

export interface TutorialCondition {
  type: TutorialConditionType;
  targetId?: string; // 条件判定に使う data-tutorial-id（省略時はstep.targetIdを使用）
}

export type TutorialPlacement = "top" | "bottom" | "center";

export interface TutorialStep {
  id: string;
  targetId?: string; // data-tutorial-id。未指定なら画面中央にカード表示
  title: string;
  body: string;
  placement?: TutorialPlacement;
  condition: TutorialCondition;
  hint?: string; // インタラクティブ操作を促す短いラベル（例：「タップしてね」）
  // 対象要素が見つからない場合に自動でスキップするか（データが無い状態でも詰まらせない）
  optionalIfMissing?: boolean;
}

export type TutorialRole = "learner" | "supporter";
