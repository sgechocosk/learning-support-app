import type { Reward } from "../../types";
import { RewardItem } from "./RewardItem";

interface RewardListProps {
  rewards: Reward[];
  isLoading: boolean;
  isSupporter: boolean;
  currentPoints: number;
  onRedeem: (rewardId: string) => Promise<{ error: string | null }>;
  onEdit: (reward: Reward) => void;
  onDelete: (rewardId: string) => void;
  onRestock: (rewardId: string, amount: number) => Promise<{ error: string | null }>;
  onReduceStock: (rewardId: string, amount: number) => Promise<{ error: string | null }>;
}

export const RewardList = ({
  rewards,
  isLoading,
  isSupporter,
  currentPoints,
  onRedeem,
  onEdit,
  onDelete,
  onRestock,
  onReduceStock,
}: RewardListProps) => {
  if (isLoading) {
    return (
      <p className="text-center text-amber-400 text-sm py-8">読み込み中...</p>
    );
  }

  const visibleRewards = isSupporter
    ? rewards
    : rewards.filter((r) => r.is_active);

  if (visibleRewards.length === 0) {
    return (
      <p className="text-center text-amber-400 text-sm py-8">
        ごほうびはまだありません
      </p>
    );
  }

  if (isSupporter) {
    return (
      <div className="flex flex-col gap-2">
        {visibleRewards.map((reward) => (
          <RewardItem
            key={reward.id}
            reward={reward}
            isSupporter
            currentPoints={currentPoints}
            onRedeem={onRedeem}
            onEdit={onEdit}
            onDelete={onDelete}
            onRestock={onRestock}
            onReduceStock={onReduceStock}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {visibleRewards.map((reward) => (
        <RewardItem
          key={reward.id}
          reward={reward}
          isSupporter={false}
          currentPoints={currentPoints}
          onRedeem={onRedeem}
          onEdit={onEdit}
          onDelete={onDelete}
          onRestock={onRestock}
          onReduceStock={onReduceStock}
        />
      ))}
    </div>
  );
};
