import { User, Bell, X } from "lucide-react";
import type { OverlayType } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import { useProfile } from "../../hooks/useProfile";

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
  const { signOut } = useAuth();
  const { profile, partnerName, isLoading } = useProfile();

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
          {type === "profile"
            ? profile?.name
              ? `${profile.name}さんのプロフィール`
              : isLoading
                ? "読み込み中..."
                : "プロフィール"
            : "お知らせ画面"}
        </h2>

        {type === "profile" && profile && (
          <div className="bg-white p-4 rounded-xl shadow-sm w-full max-w-xs mt-4 mb-2 text-sky-800">
            {profile.role === "learner" && (
              <>
                <div className="flex justify-between items-center py-2 border-b border-sky-50">
                  <span className="text-sm text-sky-600">現在のポイント</span>
                  <span className="font-bold">{profile.points} pt</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-sky-50">
                  <span className="text-sm text-sky-600">累計ポイント</span>
                  <span className="font-bold">{profile.total_points} pt</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-sky-50">
                  <span className="text-sm text-sky-600">タスク完了数</span>
                  <span className="font-bold">
                    {profile.total_completed_tasks} 回
                  </span>
                </div>
              </>
            )}

            <div
              className={`flex justify-between items-center py-2 ${
                partnerName ? "border-b border-sky-50" : ""
              }`}
            >
              <span className="text-sm text-sky-600">ロール</span>
              <span className="font-bold">
                {profile.role === "supporter" ? "サポーター" : "学習者"}
              </span>
            </div>

            {partnerName && (
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-sky-600">ペアの相手</span>
                <span className="font-bold">{partnerName} さん</span>
              </div>
            )}
          </div>
        )}

        <div className="text-sky-700 text-center text-sm px-4 flex flex-col items-center gap-6 mt-4">
          <p>
            {type === "profile"
              ? lastSignInAt
                ? `最終ログイン: ${lastSignInAt}`
                : ""
              : "最新の通知やメッセージを確認する画面のテンプレートです。"}
          </p>
          {type === "profile" && (
            <button
              onClick={signOut}
              className="px-6 py-2 bg-white text-sky-600 font-semibold rounded-full shadow-sm hover:bg-sky-50 active:bg-sky-100 transition-colors border border-sky-200"
            >
              ログアウト
            </button>
          )}
        </div>
      </main>
    </div>
  );
};
