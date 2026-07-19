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
}

export const RewardList = ({
  rewards,
  isLoading,
  isSupporter,
  currentPoints,
  onRedeem,
  onEdit,
  onDelete,
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
        />
      ))}
    </div>
  );
};
