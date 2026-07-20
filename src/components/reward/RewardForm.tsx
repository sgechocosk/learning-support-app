import { useState, useEffect } from "react";
import { X, Plus, Coins, Package, Eye, EyeOff } from "lucide-react";
import type { Reward } from "../../types";
import { useHaptic } from "../../hooks/useHaptic";
import { NumberStepper } from "../ui/NumberStepper";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { Modal } from "../ui/Modal";

interface RewardFormProps {
  isOpen: boolean;
  onToggle: () => void;
  onSubmit: (input: {
    title: string;
    description: string | null;
    requiredPoints: number;
    totalQuantity?: number | null;
    remainingQuantity?: number | null;
    imageUrl?: string | null;
    isActive?: boolean;
  }) => Promise<{ error: string | null }>;
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

  // 編集対象がある場合は、初回レンダリングの時点から編集対象の値を使う。
  // マウント後にuseEffectで書き換える方式だと、初期値(デフォルト)が
  // 一瞬だけ画面に出てから正しい値に切り替わる「ちらつき」が発生するため、
  // useState の遅延初期化で最初から正しい値を用意する。
  // （呼び出し側で editingReward ごとに key を変えてこのフォームを作り直す前提）
  const [title, setTitle] = useState(() => editingReward?.title ?? "");
  const [description, setDescription] = useState(
    () => editingReward?.description ?? "",
  );
  const [requiredPoints, setRequiredPoints] = useState<number | "">(
    () => editingReward?.required_points ?? 50,
  );
  const [isUnlimited, setIsUnlimited] = useState(() =>
    editingReward ? editingReward.total_quantity === null : true,
  );
  const [totalQuantity, setTotalQuantity] = useState<number | "">(
    () => editingReward?.total_quantity ?? 1,
  );
  const [remainingQuantity, setRemainingQuantity] = useState<number | "">(
    () => editingReward?.remaining_quantity ?? 1,
  );
  const [imageUrl, setImageUrl] = useState(
    () => editingReward?.image_url ?? "",
  );
  const [isActive, setIsActive] = useState(
    () => editingReward?.is_active ?? true,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isEditing = !!editingReward;

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
    setRemainingQuantity(1);
    setImageUrl("");
    setIsActive(true);
    setErrorMsg(null);
  };

  // 最大数（分母）を減らしたとき、現在の在庫（分子）がそれを上回らないように追従させる
  const handleTotalQuantityChange = (value: number | "") => {
    setTotalQuantity(value);
    if (
      typeof value === "number" &&
      typeof remainingQuantity === "number" &&
      remainingQuantity > value
    ) {
      setRemainingQuantity(value);
    }
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

    const resolvedTotal = totalQuantity === "" ? 0 : Math.max(0, totalQuantity);
    const resolvedRemaining =
      remainingQuantity === "" ? 0 : Math.max(0, remainingQuantity);

    const { error } = await onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      requiredPoints: requiredPoints === "" ? 0 : requiredPoints,
      totalQuantity: isUnlimited ? null : resolvedTotal,
      remainingQuantity: isUnlimited
        ? null
        : isEditing
          ? Math.min(resolvedRemaining, resolvedTotal)
          : resolvedTotal,
      imageUrl: imageUrl.trim() || null,
      isActive,
    });

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

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ごほうび名"
          className="border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="説明（任意）"
          rows={2}
          className="border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
        />

        <input
          type="text"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="画像URL（任意）"
          className="border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
        />

        <div className="flex items-center gap-2">
          <Coins className="text-amber-400 shrink-0" size={20} />
          <input
            type="number"
            min={0}
            value={requiredPoints}
            onChange={(e) => {
              const val = e.target.value;
              setRequiredPoints(val === "" ? "" : Number(val));
            }}
            placeholder="必要ポイント"
            className="w-24 border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
          <span className="text-sm font-bold text-amber-600">ポイント</span>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-amber-100 bg-amber-50/50 p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs font-bold text-amber-700">
              <Package size={14} />
              在庫
            </span>
            <ToggleSwitch
              checked={isUnlimited}
              onChange={setIsUnlimited}
              label={isUnlimited ? "無制限" : "個数を指定"}
            />
          </div>

          {!isUnlimited && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-amber-600 shrink-0">最大数</span>
                <NumberStepper
                  value={totalQuantity}
                  onChange={handleTotalQuantityChange}
                  min={0}
                  size="sm"
                />
              </div>
              {isEditing && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-emerald-600 shrink-0">
                    現在の在庫
                  </span>
                  <NumberStepper
                    value={remainingQuantity}
                    onChange={setRemainingQuantity}
                    min={0}
                    max={
                      typeof totalQuantity === "number"
                        ? totalQuantity
                        : undefined
                    }
                    size="sm"
                    accentClassName="border-emerald-200 focus:ring-emerald-300 hover:bg-emerald-50 text-emerald-600"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between rounded-lg border border-amber-100 p-3">
          <span className="flex items-center gap-1 text-xs font-bold text-amber-700">
            {isActive ? <Eye size={14} /> : <EyeOff size={14} />}
            学習者への表示
          </span>
          <ToggleSwitch
            checked={isActive}
            onChange={setIsActive}
            label={isActive ? "表示中" : "非表示"}
            accentClassName="bg-emerald-500"
          />
        </div>

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
      <Modal
        isOpen={isEditing}
        overlayClassName="z-40"
        contentClassName="w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        {formContent}
      </Modal>
    );
  }

  return formContent;
};
