import { User, Bell } from "lucide-react";
import type { OverlayType } from "../../types";

interface HeaderProps {
  onOpenOverlay: (e: React.MouseEvent, type: OverlayType) => void;
}

export const Header = ({ onOpenOverlay }: HeaderProps) => {
  return (
    <header className="flex-none h-16 bg-sky-300 text-white shadow-sm z-20 flex items-center justify-center font-bold text-lg relative">
      <button
        onClick={(e) => onOpenOverlay(e, "profile")}
        className="absolute left-4 p-2 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors"
      >
        <User size={24} />
      </button>
      UI Test
      <button
        onClick={(e) => onOpenOverlay(e, "notification")}
        className="absolute right-4 p-2 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors"
      >
        <Bell size={24} />
      </button>
    </header>
  );
};
