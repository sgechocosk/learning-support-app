import { useState } from "react";
import { Pencil, Trash2, Gift, PackageX, Sparkles, Coins } from "lucide-react";
import type { Reward } from "../../types";
import { useHaptic } from "../../hooks/useHaptic";

interface RewardItemProps {
  reward: Reward;
  isSupporter: boolean;
  currentPoints: number;
  onRedeem: (rewardId: string) => Promise<{ error: string | null }>;
  onEdit: (reward: Reward) => void;
  onDelete: (rewardId: string) => void;
}

export const RewardItem = ({
  reward,
  isSupporter,
  currentPoints,
  onRedeem,
  onEdit,
  onDelete,
}: RewardItemProps) => {
  const triggerHaptic = useHaptic();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [justRedeemed, setJustRedeemed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isOutOfStock =
    reward.remaining_quantity !== null && reward.remaining_quantity <= 0;
  const isLowStock =
    reward.remaining_quantity !== null &&
    reward.remaining_quantity > 0 &&
    reward.remaining_quantity <= 3;
  const canAfford = currentPoints >= reward.required_points;
  const canRedeem =
    !isSupporter && !isOutOfStock && canAfford && reward.is_active;

  const handleRedeemConfirm = async () => {
    triggerHaptic();
    setIsRedeeming(true);
    setErrorMsg(null);
    const { error } = await onRedeem(reward.id);
    setIsRedeeming(false);
    setIsConfirming(false);
    if (error) {
      setErrorMsg(error);
      return;
    }
    setJustRedeemed(true);
    setTimeout(() => setJustRedeemed(false), 1800);
  };

  if (isSupporter) {
    return (
      <div
        className={`flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 rounded-xl border-2 border-amber-100 shadow-sm transition-all ${
          reward.is_active
            ? "bg-white"
            : "opacity-60 grayscale-[0.2] bg-slate-50"
        }`}
      >
        <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold text-white bg-amber-400 shadow-sm shrink-0">
          <Coins size={10} />
          {reward.required_points}pt
        </span>

        <span className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-slate-500 bg-slate-100 shrink-0">
          在庫:{" "}
          {reward.remaining_quantity === null
            ? "無制限"
            : `${reward.remaining_quantity} / ${reward.total_quantity ?? "?"}個`}
        </span>

        {!reward.is_active && (
          <span className="text-[10px] font-black text-slate-400 shrink-0">
            非公開
          </span>
        )}

        <div className="flex gap-1 shrink-0 ml-auto">
          <button
            onClick={() => {
              triggerHaptic();
              onEdit(reward);
            }}
            className="p-1.5 rounded-full bg-slate-100 text-amber-500 transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => {
              triggerHaptic();
              onDelete(reward.id);
            }}
            className="p-1.5 rounded-full bg-slate-100 text-red-400 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>

        <p className="w-full basis-full font-bold text-sm break-words text-slate-700">
          {reward.title}
        </p>
        {reward.description && (
          <p className="w-full basis-full text-xs text-slate-400 break-words">
            {reward.description}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col rounded-2xl border-2 shadow-sm overflow-hidden transition-all ${
        isOutOfStock
          ? "border-slate-100 bg-slate-50 opacity-70"
          : "border-amber-100 bg-white"
      }`}
    >
      <div className="relative aspect-square w-full bg-gradient-to-br from-amber-50 to-sky-50 flex items-center justify-center">
        {reward.image_url ? (
          <img
            src={reward.image_url}
            alt={reward.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <Gift className="w-12 h-12 text-amber-300" />
        )}

        {isLowStock && !isOutOfStock && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">
            残り{reward.remaining_quantity}個！
          </span>
        )}
        {isOutOfStock && (
          <span className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
            <span className="flex items-center gap-1 bg-white text-slate-600 text-xs font-black px-3 py-1.5 rounded-full">
              <PackageX size={14} />
              在庫切れ
            </span>
          </span>
        )}

        {justRedeemed && (
          <span className="absolute inset-0 bg-amber-400/90 flex flex-col items-center justify-center gap-1 animate-[pop_0.3s_ease-out]">
            <Sparkles className="w-8 h-8 text-white" />
            <span className="text-white font-black text-sm">GET!</span>
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5 p-3 flex-1">
        <p className="font-black text-sm text-slate-700 leading-snug break-words line-clamp-2">
          {reward.title}
        </p>
        {reward.description && (
          <p className="text-[11px] text-slate-400 break-words line-clamp-2">
            {reward.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span
            className={`flex items-center gap-0.5 font-black ${
              canAfford ? "text-amber-500" : "text-slate-300"
            }`}
          >
            <Coins size={14} />
            <span className="text-lg">{reward.required_points}</span>
            <span className="text-[10px] font-bold opacity-70">pt</span>
          </span>

          <button
            disabled={!canRedeem}
            onClick={() => {
              if (!canRedeem) return;
              triggerHaptic();
              setIsConfirming(true);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition-all active:scale-95 ${
              canRedeem
                ? "bg-amber-400 text-white hover:bg-amber-500"
                : "bg-slate-100 text-slate-300 cursor-not-allowed"
            }`}
          >
            {isOutOfStock ? "終了" : canAfford ? "交換する" : "ポイント不足"}
          </button>
        </div>
      </div>

      {isConfirming && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm flex flex-col items-center gap-3 text-center">
            <Gift className="w-10 h-10 text-amber-400" />
            <h4 className="font-black text-slate-800">
              「{reward.title}」と交換しますか？
            </h4>
            <p className="text-sm text-slate-500">
              <span className="font-black text-amber-500">
                {reward.required_points}pt
              </span>{" "}
              を消費します
            </p>
            {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
            <div className="flex gap-2 w-full mt-1">
              <button
                onClick={handleRedeemConfirm}
                disabled={isRedeeming}
                className="flex-1 py-2 text-sm font-bold bg-amber-400 text-white rounded-lg hover:bg-amber-500 transition-colors disabled:opacity-50"
              >
                {isRedeeming ? "交換中..." : "交換する"}
              </button>
              <button
                onClick={() => {
                  triggerHaptic();
                  setIsConfirming(false);
                  setErrorMsg(null);
                }}
                className="flex-1 py-2 text-sm font-bold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
