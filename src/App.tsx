import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";
import Auth from "./Auth";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [pseudoLoggedOut, setPseudoLoggedOut] = useState(
    () => sessionStorage.getItem("pseudo_logout") === "true",
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = () => {
    sessionStorage.setItem("pseudo_logout", "true");
    setPseudoLoggedOut(true);
  };

  const handleLoginSuccess = () => {
    sessionStorage.removeItem("pseudo_logout");
    setPseudoLoggedOut(false);
  };

  if (!session || pseudoLoggedOut) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div>
      <h1>アプリのメイン画面</h1>
      <button onClick={handleLogout}>ログアウト</button>
    </div>
  );
}
