import { createContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Profile } from "../types";

interface ProfileContextType {
  profile: Profile | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfileState: (updates: Partial<Profile>) => void;
}

export const ProfileContext = createContext<ProfileContextType | undefined>(
  undefined,
);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // isBackground が true の場合はローディング状態にしない（裏側でこっそり更新する）
  const fetchProfile = async (isBackground = false) => {
    if (!isBackground) {
      setIsLoading(true);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data && !error) {
        setProfile(data as Profile);
      } else {
        setProfile(null);
      }
    } else {
      setProfile(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    // 初回マウント時はローディング画面を出す (isBackground = false)
    fetchProfile(false);

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        // タブ切り替えなどで再認証された時はバックグラウンドで更新する
        fetchProfile(true);
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    // 手動で更新する際もバックグラウンド更新にする
    await fetchProfile(true);
  };

  const updateProfileState = (updates: Partial<Profile>) => {
    setProfile((prev) => (prev ? { ...prev, ...updates } : null));
  };

  return (
    <ProfileContext.Provider
      value={{ profile, isLoading, refreshProfile, updateProfileState }}
    >
      {children}
    </ProfileContext.Provider>
  );
};
