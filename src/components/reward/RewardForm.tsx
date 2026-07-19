import { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import type { Reward } from "../../types";
import { useHaptic } from "../../hooks/useHaptic";

interface RewardFormProps {
  isOpen: boolean;
  onToggle: () => void;
  onSubmit: (
    input:
      | {
          title: string;
          description: string | null;
          requiredPoints: number;
          totalQuantity: number | null;
          imageUrl?: string | null;
        }
      | {
          title: string;
          description: string | null;
          requiredPoints: number;
          imageUrl?: string | null;
        },
  ) => Promise<{ error: string | null }>;
  editingReward?: Reward | null;
  onCancelEdit?: () => void;
}

export const RewardForm = ({
  isOpen,
  onToggle,
  onSubmit,
  editingReward = null,
  onCancelEdit,
}: RewardFormProps) => {
  const triggerHaptic = useHaptic();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiredPoints, setRequiredPoints] = useState<number | "">(50);
  const [isUnlimited, setIsUnlimited] = useState(true);
  const [totalQuantity, setTotalQuantity] = useState<number | "">(1);
  const [imageUrl, setImageUrl] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isEditing = !!editingReward;

  useEffect(() => {
    if (editingReward) {
      setTitle(editingReward.title);
      setDescription(editingReward.description ?? "");
      setRequiredPoints(editingReward.required_points);
      setImageUrl(editingReward.image_url ?? "");
    }
  }, [editingReward]);

  useEffect(() => {
    if (!isEditing) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isEditing]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setRequiredPoints(50);
    setIsUnlimited(true);
    setTotalQuantity(1);
    setImageUrl("");
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    if (!title.trim()) {
      setErrorMsg("ごほうび名を入力してください");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);

    // 新規作成時のみ total_quantity(=在庫の総数) を指定する。
    // 編集時は在庫数を扱わない（在庫の増減は一覧の「在庫を調整」から行う）ため、
    // タイトルや必要ポイントなど在庫以外の項目のみを更新する。
    const { error } = await onSubmit(
      isEditing
        ? {
            title: title.trim(),
            description: description.trim() || null,
            requiredPoints: requiredPoints === "" ? 0 : requiredPoints,
            imageUrl: imageUrl.trim() || null,
          }
        : {
            title: title.trim(),
            description: description.trim() || null,
            requiredPoints: requiredPoints === "" ? 0 : requiredPoints,
            totalQuantity: isUnlimited
              ? null
              : totalQuantity === ""
                ? 0
                : totalQuantity,
            imageUrl: imageUrl.trim() || null,
          },
    );

    setIsSubmitting(false);

    if (error) {
      setErrorMsg(error);
      return;
    }

    resetForm();
    if (isEditing && onCancelEdit) onCancelEdit();
    if (!isEditing) onToggle();
  };

  if (!isOpen && !isEditing) {
    return (
      <button
        type="button"
        onClick={() => {
          triggerHaptic();
          onToggle();
        }}
        className="flex items-center justify-center gap-2 w-full py-3 bg-amber-400 text-white font-semibold rounded-xl shadow-sm hover:bg-amber-500 active:bg-amber-600 transition-colors"
      >
        <Plus size={18} />
        新しいごほうびを作成
      </button>
    );
  }

  const formContent = (
    <div
      className={
        isEditing
          ? "bg-white rounded-xl shadow-xl p-4 w-full max-w-md max-h-[90vh] overflow-y-auto"
          : "bg-white rounded-xl shadow-sm p-4"
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-amber-700">
            {isEditing ? "ごほうびを編集" : "新しいごほうび"}
          </h3>
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              resetForm();
              if (isEditing && onCancelEdit) onCancelEdit();
              else onToggle();
            }}
            className="p-1 rounded-full hover:bg-amber-50 text-amber-400"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-amber-700 font-medium">
            ごほうび名
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 30分ゲームチケット"
            className="border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-amber-700 font-medium">
            説明（任意）
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="例: 好きなゲームを30分プレイできます"
            rows={2}
            className="border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-amber-700 font-medium">
            画像URL（任意）
          </label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            className="border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-amber-700 font-medium">
            交換に必要なポイント
          </label>
          <input
            type="number"
            min={0}
            value={requiredPoints}
            onChange={(e) => {
              const val = e.target.value;
              setRequiredPoints(val === "" ? "" : Number(val));
            }}
            className="border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>

        {isEditing ? (
          <div className="flex flex-col gap-1 bg-amber-50 rounded-lg px-3 py-2">
            <span className="text-xs text-amber-700 font-medium">在庫</span>
            <span className="text-xs text-amber-600">
              現在の在庫：
              {editingReward?.remaining_quantity === null
                ? "無制限"
                : `${editingReward?.remaining_quantity} / ${editingReward?.total_quantity ?? "?"}個`}
            </span>
            <span className="text-[11px] text-amber-500">
              在庫の補充・変更は一覧の「在庫を調整」ボタンから行えます
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="text-xs text-amber-700 font-medium">在庫</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setIsUnlimited(true);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                  isUnlimited
                    ? "bg-amber-400 text-white border-transparent"
                    : "bg-white text-amber-600 border-amber-300"
                }`}
              >
                無制限
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setIsUnlimited(false);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                  !isUnlimited
                    ? "bg-amber-400 text-white border-transparent"
                    : "bg-white text-amber-600 border-amber-300"
                }`}
              >
                個数を指定
              </button>
              {!isUnlimited && (
                <input
                  type="number"
                  min={0}
                  value={totalQuantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTotalQuantity(val === "" ? "" : Number(val));
                  }}
                  className="w-20 border border-amber-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              )}
            </div>
          </div>
        )}

        {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 py-2.5 bg-amber-400 text-white font-semibold rounded-xl shadow-sm hover:bg-amber-500 active:bg-amber-600 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "保存中..." : isEditing ? "更新する" : "作成する"}
        </button>
      </form>
    </div>
  );

  if (isEditing) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        {formContent}
      </div>
    );
  }

  return formContent;
};
