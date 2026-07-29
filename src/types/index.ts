import type { LucideIcon } from "lucide-react";

export type TabId = "home" | "calendar" | "checksquare" | "timer" | "gift";

export interface TabInfo {
  id: TabId;
  icon: LucideIcon;
  label: string;
}

export type OverlayType = "none" | "profile" | "notification";

export interface Profile {
  id: string;
  name: string;
  role: "supporter" | "learner";
  points: number;
  total_points: number;
  total_completed_tasks: number;
  created_at: string;
}

export interface Pair {
  id: string;
  supporter_id: string;
  learner_id: string;
  name: string;
  created_at: string;
}

export interface Category {
  id: string;
  pair_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface Reward {
  id: string;
  pair_id: string;
  title: string;
  description: string | null;
  required_points: number;
  total_quantity: number | null; // null = 在庫無制限
  remaining_quantity: number | null; // null = 在庫無制限
  image_url: string | null;
  is_active: boolean;
  sort_order: number; // 支援者が並び替えた表示順（昇順）
  created_at: string;
}

export interface RewardRedemption {
  id: string;
  pair_id: string;
  reward_id: string | null;
  learner_id: string;
  reward_title: string;
  required_points: number;
  redeemed_at: string;
}

export interface TimerSettings {
  pair_id: string;
  interval_minutes: number; // いちごが1つ貯まるまでの分数（1〜10の自然数）
  continue_in_background: boolean; // タブ/アプリを離れても継続するか
  points_timing: "realtime" | "on_finish"; // ポイント付与タイミング
  updated_at: string;
}

export interface Task {
  id: string;
  pair_id: string;
  category_id: string | null;
  title: string;
  reward_points: number;
  is_completed: boolean;
  scheduled_at: string | null;
  completed_at: string | null;
  points_awarded_at: string | null;
  created_at: string;
  is_daily: boolean;
  categories?: Category | null;
}

// Gemini APIによる自然言語タスク操作エージェントの結果1件分。
// 「作成」「編集」「削除」のいずれかを表す。
export type AiTaskOperationKind = "create" | "update" | "delete";

export interface AiTaskOperationDraft {
  operation: AiTaskOperationKind;
  // update/delete: 解決済みの既存タスクID。解決できなかった場合は null。
  taskId: string | null;
  // update/delete: 対象として認識した元のタスク（表示確認用）。解決できなければ null。
  matchedTask: Task | null;
  // AIが操作を提案した理由（プレビュー表示用の短い説明）
  reason: string | null;
  // create: 新しいタイトル（必須） / update: 変更後タイトル（変更なければ null）
  title: string | null;
  // 変更後のカテゴリ名。create時はnullなら未分類、update時はnullなら変更なし
  categoryName: string | null;
  // update時、カテゴリを明示的に未分類へ戻す場合 true
  clearCategory: boolean;
  // 変更後のポイント。create時はnullならデフォルト値、update時はnullなら変更なし
  rewardPoints: number | null;
  // 変更後の予定日 "YYYY-MM-DD"。create時はnullなら未設定、update時はnullなら変更なし
  scheduledAt: string | null;
  // update時、予定日を明示的にクリアする場合 true
  clearScheduledAt: boolean;
}

export interface PointEvent {
  id: string;
  pair_id: string;
  learner_id: string;
  source: "task" | "timer";
  task_id: string | null;
  amount: number;
  created_at: string;
  jst_date: string; // "YYYY-MM-DD"（DBの date 型。日本時刻午前4時始まりの日付）
}
