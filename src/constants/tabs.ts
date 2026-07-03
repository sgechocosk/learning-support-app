import { Home, Calendar, CheckSquare, Timer, Gift } from "lucide-react";
import type { TabInfo } from "../types";

export const TABS: TabInfo[] = [
  { id: "home", icon: Home, label: "ホーム" },
  { id: "calendar", icon: Calendar, label: "カレンダー" },
  { id: "checksquare", icon: CheckSquare, label: "タスク" },
  { id: "timer", icon: Timer, label: "タイマー" },
  { id: "gift", icon: Gift, label: "ごほうび" },
];
