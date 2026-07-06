import { createContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Profile } from "../types";

interface ProfileContextType {
  profile: Profile | null;
  partnerName: string | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfileState: (updates: Partial<Profile>) => void;
}

export const ProfileContext = createContext<ProfileContextType | undefined>(
  undefined,
);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

        const { data: pairData } = await supabase
          .from("pairs")
          .select("*")
          .or(`supporter_id.eq.${user.id},learner_id.eq.${user.id}`)
          .single();

        if (pairData) {
          const partnerId =
            data.role === "learner"
              ? pairData.supporter_id
              : pairData.learner_id;

          const { data: partnerData } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", partnerId)
            .single();

          if (partnerData) {
            setPartnerName(partnerData.name);
          }
        }
      } else {
        setProfile(null);
        setPartnerName(null);
      }
    } else {
      setProfile(null);
      setPartnerName(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProfile(false);

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        fetchProfile(true);
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
        setPartnerName(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    await fetchProfile(true);
  };

  const updateProfileState = (updates: Partial<Profile>) => {
    setProfile((prev) => (prev ? { ...prev, ...updates } : null));
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        partnerName,
        isLoading,
        refreshProfile,
        updateProfileState,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};
