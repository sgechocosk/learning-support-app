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

export interface Category {
  id: string;
  pair_id: string;
  name: string;
  color: string | null;
  created_at: string;
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
  created_at: string;
  categories?: Category | null;
}
