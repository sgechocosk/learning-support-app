import { User, Bell, X } from "lucide-react";
import type { OverlayType } from "../../types";

interface OverlayProps {
  type: OverlayType;
  isClosing: boolean;
  lastSignInAt: string | null;
  onClose: () => void;
}

export const Overlay = ({
  type,
  isClosing,
  lastSignInAt,
  onClose,
}: OverlayProps) => {
  if (type === "none") return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-sky-50 ${
        isClosing
          ? type === "profile"
            ? "animate-ripple-out"
            : "animate-slide-up-out"
          : type === "profile"
            ? "animate-ripple-in"
            : "animate-slide-down-in"
      }`}
    >
      <header className="flex-none h-16 bg-sky-300 text-white shadow-sm flex items-center px-4 relative">
        {type === "profile" ? (
          <button
            onClick={onClose}
            className="absolute left-4 p-2 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors z-10"
          >
            <X size={24} />
          </button>
        ) : (
          <button
            onClick={onClose}
            className="absolute right-4 p-2 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors z-10"
          >
            <Bell size={24} />
          </button>
        )}

        <h1 className="absolute inset-0 flex items-center justify-center font-bold text-lg">
          {type === "profile" ? "プロフィール" : "お知らせ"}
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
        <div className="w-24 h-24 bg-white text-sky-400 rounded-full flex items-center justify-center mb-6 shadow-sm">
          {type === "profile" ? <User size={48} /> : <Bell size={48} />}
        </div>
        <h2 className="text-xl font-bold text-sky-800 mb-2">
          {type === "profile" ? "プロフィール画面" : "お知らせ画面"}
        </h2>
        <p className="text-sky-700 text-center text-sm px-4">
          {type === "profile"
            ? lastSignInAt
              ? `最終ログイン: ${lastSignInAt}`
              : ""
            : "最新の通知やメッセージを確認する画面のテンプレートです。"}
        </p>
      </main>
    </div>
  );
};
