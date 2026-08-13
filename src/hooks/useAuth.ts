import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { removePushSubscription } from "../lib/push";

export const useAuth = () => {
  const initialAuth = localStorage.getItem("is_logged_in") === "true";
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth);
  const [lastSignInAt, setLastSignInAt] = useState<string | null>(null);

  useEffect(() => {
    const initUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setIsAuthenticated(true);
        localStorage.setItem("is_logged_in", "true");
        if (user.last_sign_in_at) {
          setLastSignInAt(
            new Date(user.last_sign_in_at).toLocaleString("ja-JP"),
          );
        }
      } else {
        setIsAuthenticated(false);
        localStorage.removeItem("is_logged_in");
      }
    };

    initUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true);
        localStorage.setItem("is_logged_in", "true");
        if (session.user.last_sign_in_at) {
          setLastSignInAt(
            new Date(session.user.last_sign_in_at).toLocaleString("ja-JP"),
          );
        }
      } else {
        setIsAuthenticated(false);
        localStorage.removeItem("is_logged_in");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // この端末のpush購読を、認証がまだ有効なうちに（RLSでの削除が
    // 通る間に）先に解除しておく。家族共有端末などで複数アカウントを
    // 切り替えて使うケースでは、ログアウト後もこの端末にログアウトした
    // アカウント宛のpush通知が届き続けてしまう（＝次にこの端末を
    // 使う別の人にその内容が見えてしまう）事故を防ぐため。
    // 失敗してもログアウト自体は継続する（ベストエフォート）。
    await removePushSubscription().catch((err) => {
      console.warn("[auth] signOut時のpush購読解除に失敗:", err);
    });

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return { isAuthenticated, setIsAuthenticated, lastSignInAt, signOut };
};
