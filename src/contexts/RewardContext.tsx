import {
  createContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
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
  // 在庫を補充する（remaining_quantity と total_quantity を同じ数だけ増やす）
  restockReward: (
    rewardId: string,
    amount: number,
  ) => Promise<{ error: string | null }>;
  // 在庫を手動で減らす（remaining_quantity のみを減らす。total_quantity は変えない）
  reduceStockReward: (
    rewardId: string,
    amount: number,
  ) => Promise<{ error: string | null }>;
  // 支援者がドラッグ&ドロップで並び替えた順序を保存する
  // orderedIds は並び替え後の全件分の reward.id を順番通りに並べた配列
  reorderRewards: (orderedIds: string[]) => Promise<{ error: string | null }>;
}

export const RewardContext = createContext<RewardContextType | undefined>(
  undefined,
);

export const RewardProvider = ({ children }: { children: ReactNode }) => {
  const { pairId, refreshProfile } = useProfile();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Realtimeの複数イベントや手動更新が短時間に重なった際、
  // 実際のfetchを1回にまとめて「ちらつき」を防ぐためのデバウンス用タイマー
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sortRewards = (list: Reward[]) => {
    return [...list].sort((a, b) => {
      const diff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
      if (diff !== 0) return diff;
      // sort_order が同値（未設定データなど）の場合は作成日時の昇順にフォールバック
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
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

  // Realtimeのイベントが立て続けに来ても、最後の1回だけをまとめて実行する
  const scheduleBackgroundFetch = (delay = 350) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      fetchRewards(true);
    }, delay);
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
        () => scheduleBackgroundFetch(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reward_redemptions",
          filter: `pair_id=eq.${pairId}`,
        },
        () => scheduleBackgroundFetch(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
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
    // 新規作成は常に一覧の末尾に追加する
    const nextSortOrder =
      rewards.length === 0
        ? 0
        : Math.max(...rewards.map((r) => r.sort_order ?? 0)) + 1;
    const { error } = await supabase.from("rewards").insert({
      pair_id: pairId,
      title,
      description,
      required_points: requiredPoints,
      total_quantity: totalQuantity,
      remaining_quantity: totalQuantity, // 作成時は在庫=総数からスタート
      image_url: imageUrl,
      sort_order: nextSortOrder,
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
    const target = rewards.find((r) => r.id === rewardId);

    const { error } = await supabase.rpc("redeem_reward", {
      reward_id: rewardId,
    });

    if (error) return { error: error.message };

    // --- 楽観的更新 ---
    // サーバーの結果を待って再取得すると、Realtimeイベントとの競合で
    // 画面がちらつくため、成功が確定した時点でローカルの状態を即座に書き換える。
    // その後のRealtime由来の再取得(scheduleBackgroundFetch)はデバウンスされるため
    // ほぼ同じ内容で1回上書きされるだけになり、見た目の変化は起きない。
    if (target) {
      setRewards((prev) =>
        prev.map((r) =>
          r.id === rewardId
            ? {
                ...r,
                remaining_quantity:
                  r.remaining_quantity !== null
                    ? Math.max(0, r.remaining_quantity - 1)
                    : null,
              }
            : r,
        ),
      );
      setRedemptions((prev) => [
        {
          id: `optimistic-${Date.now()}`,
          pair_id: target.pair_id,
          reward_id: target.id,
          learner_id: "",
          reward_title: target.title,
          required_points: target.required_points,
          redeemed_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    }

    await refreshProfile(); // ポイント残高を即時反映
    return { error: null };
  };

  const restockReward = async (rewardId: string, amount: number) => {
    if (amount <= 0) return { error: "1個以上を指定してください" };
    const target = rewards.find((r) => r.id === rewardId);
    if (!target) return { error: "対象のごほうびが見つかりません" };
    if (target.remaining_quantity === null) {
      // 無制限設定のごほうびは補充不要
      return { error: null };
    }

    const nextRemaining = target.remaining_quantity + amount;
    const nextTotal =
      (target.total_quantity ?? target.remaining_quantity) + amount;

    // 楽観的更新
    setRewards((prev) =>
      prev.map((r) =>
        r.id === rewardId
          ? {
              ...r,
              remaining_quantity: nextRemaining,
              total_quantity: nextTotal,
            }
          : r,
      ),
    );

    const { error } = await supabase
      .from("rewards")
      .update({
        remaining_quantity: nextRemaining,
        total_quantity: nextTotal,
      })
      .eq("id", rewardId);

    if (error) {
      // 失敗時は再取得して整合性を戻す
      await fetchRewards(true);
      return { error: error.message };
    }
    return { error: null };
  };

  const reduceStockReward = async (rewardId: string, amount: number) => {
    if (amount <= 0) return { error: "1個以上を指定してください" };
    const target = rewards.find((r) => r.id === rewardId);
    if (!target) return { error: "対象のごほうびが見つかりません" };
    if (target.remaining_quantity === null) {
      // 無制限設定のごほうびは対象外
      return { error: null };
    }
    if (amount > target.remaining_quantity) {
      return {
        error: `現在の在庫（${target.remaining_quantity}個）を超えて減らすことはできません`,
      };
    }

    const nextRemaining = target.remaining_quantity - amount;

    // 楽観的更新（total_quantity は変更しない）
    setRewards((prev) =>
      prev.map((r) =>
        r.id === rewardId ? { ...r, remaining_quantity: nextRemaining } : r,
      ),
    );

    const { error } = await supabase
      .from("rewards")
      .update({ remaining_quantity: nextRemaining })
      .eq("id", rewardId);

    if (error) {
      // 失敗時は再取得して整合性を戻す
      await fetchRewards(true);
      return { error: error.message };
    }
    return { error: null };
  };

  // 支援者がドラッグ&ドロップで並び替えた順序を保存する
  const reorderRewards = async (orderedIds: string[]) => {
    const prevRewards = rewards;
    const orderIndex = new Map(orderedIds.map((id, index) => [id, index]));

    // 楽観的更新（並び替え結果を即座に画面へ反映）
    const nextRewards = rewards
      .map((r) =>
        orderIndex.has(r.id)
          ? { ...r, sort_order: orderIndex.get(r.id) as number }
          : r,
      )
      .sort((a, b) => a.sort_order - b.sort_order);
    setRewards(nextRewards);

    const results = await Promise.all(
      orderedIds.map((id, index) =>
        supabase.from("rewards").update({ sort_order: index }).eq("id", id),
      ),
    );
    const firstError = results.find((r) => r.error)?.error;

    if (firstError) {
      // 失敗時は元の並びに戻す
      setRewards(prevRewards);
      return { error: firstError.message };
    }
    return { error: null };
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
        restockReward,
        reduceStockReward,
        reorderRewards,
      }}
    >
      {children}
    </RewardContext.Provider>
  );
};
