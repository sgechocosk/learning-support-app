import { useState } from "react";
import { GripVertical } from "lucide-react";
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
  // 支援者がドラッグ&ドロップで並び替えたときに呼ばれる
  onReorder?: (draggedId: string, targetId: string) => void;
}

export const RewardList = ({
  rewards,
  isLoading,
  isSupporter,
  currentPoints,
  onRedeem,
  onEdit,
  onDelete,
  onReorder,
}: RewardListProps) => {
  // ドラッグ中のごほうびIDと、現在ドラッグが重なっているごほうびID
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

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
          <div
            key={reward.id}
            onDragOver={(e) => {
              if (!draggedId || draggedId === reward.id) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setDragOverId(reward.id);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (draggedId && draggedId !== reward.id && onReorder) {
                onReorder(draggedId, reward.id);
              }
              setDraggedId(null);
              setDragOverId(null);
            }}
            onDragLeave={() => {
              setDragOverId((current) =>
                current === reward.id ? null : current,
              );
            }}
            className={`flex items-stretch gap-1 rounded-xl transition-all ${
              draggedId === reward.id ? "opacity-40" : ""
            } ${
              dragOverId === reward.id
                ? "ring-2 ring-amber-300 ring-offset-1"
                : ""
            }`}
          >
            <span
              draggable
              onDragStart={(e) => {
                setDraggedId(reward.id);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", reward.id);
              }}
              onDragEnd={() => {
                setDraggedId(null);
                setDragOverId(null);
              }}
              className="flex shrink-0 items-center px-0.5 text-amber-300 cursor-grab active:cursor-grabbing touch-none"
              title="ドラッグで並び替え"
            >
              <GripVertical size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <RewardItem
                reward={reward}
                isSupporter
                currentPoints={currentPoints}
                onRedeem={onRedeem}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
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
