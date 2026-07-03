import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return { isAuthenticated, setIsAuthenticated, lastSignInAt, signOut };
};
