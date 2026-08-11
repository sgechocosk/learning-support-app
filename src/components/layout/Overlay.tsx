import { useEffect, useState } from "react";
import { User, Bell, X } from "lucide-react";
import type { AppNotification, OverlayType } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import { useProfile } from "../../hooks/useProfile";
import { supabase } from "../../lib/supabaseClient";

const formatNotificationDate = (dateString: string) => {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

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
  const { profile, partnerName, pairId, isLoading } = useProfile();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);

  useEffect(() => {
    if (type !== "notification" || !pairId) return;

    let isActive = true;

    const fetchNotifications = async () => {
      setIsLoadingNotifications(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("pair_id", pairId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (isActive && data && !error) {
        setNotifications(data as AppNotification[]);
      }
      if (isActive) setIsLoadingNotifications(false);
    };

    fetchNotifications();

    // 既読にする（学習者が画面を開いたタイミングで未読を消化する）
    const markAsRead = async () => {
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("pair_id", pairId)
        .is("read_at", null);
    };
    markAsRead();

    const channel = supabase
      .channel(`notifications-pair-${pairId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `pair_id=eq.${pairId}`,
        },
        () => fetchNotifications(),
      )
      .subscribe();

    return () => {
      isActive = false;
      supabase.removeChannel(channel);
    };
  }, [type, pairId]);

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
      <header className="flex-none h-12 bg-sky-300 text-white shadow-sm z-20 flex items-start justify-center font-bold text-lg relative">
        {type === "profile" ? (
          <button
            onClick={onClose}
            className="absolute left-4 top-0 p-2 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors"
          >
            <X size={24} />
          </button>
        ) : (
          <button
            onClick={onClose}
            className="absolute right-4 top-0 p-2 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors"
          >
            <Bell size={24} />
          </button>
        )}

        <span className="pt-2">
          {type === "profile" ? "プロフィール" : "お知らせ"}
        </span>
      </header>

      <main
        className={`flex-1 overflow-y-auto p-6 flex flex-col ${
          type === "notification"
            ? "items-stretch"
            : "items-center justify-center"
        }`}
      >
        {type === "notification" ? (
          <div className="flex flex-col gap-3 w-full max-w-md mx-auto">
            {isLoadingNotifications ? (
              <p className="text-sky-500 text-sm text-center mt-8">
                読み込み中...
              </p>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-3 mt-8">
                <div className="w-20 h-20 bg-white text-sky-300 rounded-full flex items-center justify-center shadow-sm">
                  <Bell size={40} />
                </div>
                <p className="text-sky-500 text-sm text-center">
                  お知らせはまだありません
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="bg-white rounded-xl shadow-sm p-4 flex gap-3 items-start"
                >
                  <div className="w-9 h-9 shrink-0 bg-sky-50 text-sky-400 rounded-full flex items-center justify-center">
                    <Bell size={18} />
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <p className="text-sm text-sky-900 font-medium break-words">
                      {n.message}
                    </p>
                    <span className="text-xs text-sky-400">
                      {formatNotificationDate(n.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            <div className="w-24 h-24 bg-white text-sky-400 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <User size={48} />
            </div>

            <h2 className="text-xl font-bold text-sky-800 mb-2">
              {profile?.name
                ? `${profile.name}さんのプロフィール`
                : isLoading
                  ? "読み込み中..."
                  : "プロフィール"}
            </h2>
          </>
        )}

        {type === "profile" && profile && (
          <div className="bg-white p-4 rounded-xl shadow-sm w-full max-w-xs mt-4 mb-2 text-sky-800">
            {profile.role === "learner" && (
              <>
                <div className="flex justify-between items-center py-2 border-b border-sky-50">
                  <span className="text-sm text-sky-600">現在のいちご</span>
                  <span className="font-bold">{profile.points} コ</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-sky-50">
                  <span className="text-sm text-sky-600">累計いちご</span>
                  <span className="font-bold">{profile.total_points} コ</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-sky-50">
                  <span className="text-sm text-sky-600">タスク完了数</span>
                  <span className="font-bold">
                    {profile.total_completed_tasks} 回
                  </span>
                </div>
              </>
            )}

            {partnerName && (
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-sky-600">ペアの相手</span>
                <span className="font-bold">{partnerName} さん</span>
              </div>
            )}
          </div>
        )}

        {type === "profile" && (
          <div className="text-sky-700 text-center text-sm px-4 flex flex-col items-center gap-6 mt-4">
            <p>{lastSignInAt ? `最終ログイン: ${lastSignInAt}` : ""}</p>
            <button
              onClick={signOut}
              className="px-6 py-2 bg-white text-sky-600 font-semibold rounded-full shadow-sm hover:bg-sky-50 active:bg-sky-100 transition-colors border border-sky-200"
            >
              ログアウト
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
