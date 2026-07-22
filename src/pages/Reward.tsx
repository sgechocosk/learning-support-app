import { useState } from "react";
import { Clock3 } from "lucide-react";
import { useProfile } from "../hooks/useProfile";
import { useReward } from "../hooks/useReward";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { RewardForm } from "../components/reward/RewardForm";
import { RewardList } from "../components/reward/RewardList";
import { PullToRefreshIndicator } from "../components/ui/PullToRefreshIndicator";
import type { Reward as RewardType } from "../types";

export default function Reward() {
  const { profile } = useProfile();
  const {
    rewards,
    redemptions,
    isLoading,
    refreshRewards,
    createReward,
    updateReward,
    deleteReward,
    redeemReward,
    reorderRewards,
  } = useReward();

  const [showForm, setShowForm] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardType | null>(null);

  const { containerRef, pullDistance, isRefreshing, isReady } =
    usePullToRefresh<HTMLDivElement>({ onRefresh: refreshRewards });

  const isSupporter = profile?.role === "supporter";

  const handleSubmit = (input: {
    title: string;
    description: string | null;
    requiredPoints: number;
    totalQuantity?: number | null;
    remainingQuantity?: number | null;
    imageUrl?: string | null;
    isActive?: boolean;
  }) => {
    // 最大数・現在の在庫・表示/非表示は RewardForm 側で確定済みの値が渡される
    if (editingReward) {
      return updateReward(editingReward.id, input);
    }
    // 新規作成時は RewardForm 側で必ず totalQuantity が渡される
    return createReward(
      input as { totalQuantity: number | null } & typeof input,
    );
  };

  // ドラッグしたごほうびを、ドロップ先のごほうびの位置へ移動する
  const handleReorder = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    const currentIds = rewards.map((r) => r.id);
    const fromIndex = currentIds.indexOf(draggedId);
    const toIndex = currentIds.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const nextIds = [...currentIds];
    nextIds.splice(fromIndex, 1);
    nextIds.splice(toIndex, 0, draggedId);
    reorderRewards(nextIds);
  };

  const handleDelete = async (rewardId: string) => {
    if (!window.confirm("このごほうびを削除しますか？")) return;
    await deleteReward(rewardId);
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-3">
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        isReady={isReady}
      />

      {!isSupporter && (
        <div className="flex justify-end">
          <span
            className="text-amber-500 font-bold"
            style={{
              fontFamily:
                '"M PLUS Rounded 1c", "Nunito", "Quicksand", sans-serif',
            }}
          >
            たまったいちご：{profile?.points ?? 0}コ
          </span>
        </div>
      )}

      {isSupporter && (
        <RewardForm
          // editingReward が変わるたびに（新規↔編集の切り替えを含め）確実に作り直し、
          // 前のごほうびの状態が一瞬だけ残る「ちらつき」を防ぐ
          key={editingReward ? `edit-${editingReward.id}` : "create"}
          isOpen={showForm}
          onToggle={() => setShowForm((v) => !v)}
          onSubmit={handleSubmit}
          editingReward={editingReward}
          onCancelEdit={() => setEditingReward(null)}
        />
      )}

      <RewardList
        rewards={rewards}
        isLoading={isLoading}
        isSupporter={isSupporter}
        currentPoints={profile?.points ?? 0}
        onRedeem={redeemReward}
        onEdit={(reward) => setEditingReward(reward)}
        onDelete={handleDelete}
        onReorder={handleReorder}
      />

      {redemptions.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold px-1">
            <Clock3 size={12} />
            交換履歴
          </div>
          <div className="flex flex-col gap-1.5">
            {redemptions.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between px-3 py-2 bg-white/70 rounded-lg text-xs text-slate-500"
              >
                <span className="font-semibold truncate">{r.reward_title}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-amber-500">
                    -{r.required_points}コ
                  </span>
                  <span>
                    {new Date(r.redeemed_at).toLocaleDateString("ja-JP", {
                      month: "numeric",
                      day: "numeric",
                    })}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
