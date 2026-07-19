import { createContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Reward, RewardRedemption } from "../types";
import { useProfile } from "../hooks/useProfile";

interface RewardContextType {
  rewards: Reward[];
  redemptions: RewardRedemption[];
  isLoading: boolean;
  refreshRewards: () => Promise<void>;
  createReward: (input: {
    title: string;
    description: string | null;
    requiredPoints: number;
    totalQuantity: number | null;
    imageUrl?: string | null;
  }) => Promise<{ error: string | null }>;
  updateReward: (
    rewardId: string,
    updates: {
      title?: string;
      description?: string | null;
      requiredPoints?: number;
      totalQuantity?: number | null;
      remainingQuantity?: number | null;
      imageUrl?: string | null;
      isActive?: boolean;
    },
  ) => Promise<{ error: string | null }>;
  deleteReward: (rewardId: string) => Promise<{ error: string | null }>;
  redeemReward: (rewardId: string) => Promise<{ error: string | null }>;
}

export const RewardContext = createContext<RewardContextType | undefined>(
  undefined,
);

export const RewardProvider = ({ children }: { children: ReactNode }) => {
  const { pairId, refreshProfile } = useProfile();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const sortRewards = (list: Reward[]) => {
    return [...list].sort((a, b) => a.required_points - b.required_points);
  };

  const fetchRewards = async (isBackground = false) => {
    if (!pairId) {
      setRewards([]);
      setRedemptions([]);
      setIsLoading(false);
      return;
    }
    if (!isBackground) setIsLoading(true);

    const [{ data: rewardData, error: rewardError }, { data: redemptionData }] =
      await Promise.all([
        supabase.from("rewards").select("*").eq("pair_id", pairId),
        supabase
          .from("reward_redemptions")
          .select("*")
          .eq("pair_id", pairId)
          .order("redeemed_at", { ascending: false })
          .limit(20),
      ]);

    if (rewardData && !rewardError)
      setRewards(sortRewards(rewardData as Reward[]));
    if (redemptionData) setRedemptions(redemptionData as RewardRedemption[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRewards();

    if (!pairId) return;

    const channel = supabase
      .channel(`rewards-pair-${pairId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rewards",
          filter: `pair_id=eq.${pairId}`,
        },
        () => fetchRewards(true),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reward_redemptions",
          filter: `pair_id=eq.${pairId}`,
        },
        () => fetchRewards(true),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pairId]);

  const createReward: RewardContextType["createReward"] = async ({
    title,
    description,
    requiredPoints,
    totalQuantity,
    imageUrl = null,
  }) => {
    if (!pairId) return { error: "pair not found" };
    const { error } = await supabase.from("rewards").insert({
      pair_id: pairId,
      title,
      description,
      required_points: requiredPoints,
      total_quantity: totalQuantity,
      remaining_quantity: totalQuantity, // 作成時は在庫=総数からスタート
      image_url: imageUrl,
    });
    if (!error) await fetchRewards(true);
    return { error: error?.message ?? null };
  };

  const updateReward: RewardContextType["updateReward"] = async (
    rewardId,
    updates,
  ) => {
    const payload: Record<string, unknown> = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined)
      payload.description = updates.description;
    if (updates.requiredPoints !== undefined)
      payload.required_points = updates.requiredPoints;
    if (updates.totalQuantity !== undefined)
      payload.total_quantity = updates.totalQuantity;
    if (updates.remainingQuantity !== undefined)
      payload.remaining_quantity = updates.remainingQuantity;
    if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;

    const { error } = await supabase
      .from("rewards")
      .update(payload)
      .eq("id", rewardId);
    if (!error) await fetchRewards(true);
    return { error: error?.message ?? null };
  };

  const deleteReward = async (rewardId: string) => {
    const { error } = await supabase
      .from("rewards")
      .delete()
      .eq("id", rewardId);
    if (!error) await fetchRewards(true);
    return { error: error?.message ?? null };
  };

  const redeemReward = async (rewardId: string) => {
    const { error } = await supabase.rpc("redeem_reward", {
      reward_id: rewardId,
    });
    if (!error) {
      await fetchRewards(true);
      await refreshProfile(); // ポイント残高を即時反映
    }
    return { error: error?.message ?? null };
  };

  return (
    <RewardContext.Provider
      value={{
        rewards,
        redemptions,
        isLoading,
        refreshRewards: () => fetchRewards(true),
        createReward,
        updateReward,
        deleteReward,
        redeemReward,
      }}
    >
      {children}
    </RewardContext.Provider>
  );
};
