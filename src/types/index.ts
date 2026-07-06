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
