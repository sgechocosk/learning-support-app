import type { LucideIcon } from "lucide-react";

export type TabId = "home" | "calendar" | "checksquare" | "timer" | "gift";

export interface TabInfo {
  id: TabId;
  icon: LucideIcon;
  label: string;
}

export type OverlayType = "none" | "profile" | "notification";
