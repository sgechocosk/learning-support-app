import { useState, useEffect, useRef } from "react";
import { X, Plus, Coins } from "lucide-react";
import { useCategory } from "../../hooks/useCategory";
import type { Task } from "../../types";
import { useHaptic } from "../../hooks/useHaptic";
import { Modal } from "../ui/Modal";

interface TaskFormProps {
  isOpen: boolean;
  onToggle: () => void;
  onSubmit: (input: {
    title: string;
    categoryId: string | null;
    rewardPoints: number;
    scheduledAt?: string | null;
  }) => Promise<{ error: string | null }>;
  editingTask?: Task | null;
  onCancelEdit?: () => void;
}

const formatDateForInput = (dateString?: string | null) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const TaskForm = ({
  isOpen,
  onToggle,
  onSubmit,
  editingTask = null,
  onCancelEdit,
}: TaskFormProps) => {
  const triggerHaptic = useHaptic();
  const { categories, addCategory, deleteCategory } = useCategory();

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [rewardPoints, setRewardPoints] = useState<number | "">(10);
  const [scheduledAt, setScheduledAt] = useState<string>("");

  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#38bdf8");

  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isEditing = !!editingTask;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressed = useRef(false);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setCategoryId(editingTask.category_id ?? "");
      setRewardPoints(editingTask.reward_points);
      setScheduledAt(formatDateForInput(editingTask.scheduled_at));
    }
  }, [editingTask]);

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
    setCategoryId("");
    setRewardPoints(10);
    setScheduledAt("");
    setIsCreatingCategory(false);
    setNewCategoryName("");
    setErrorMsg(null);
  };

  const handleAddCategory = async () => {
    triggerHaptic();
    if (!newCategoryName.trim()) return;

    const { data, error } = await addCategory(
      newCategoryName.trim(),
      newCategoryColor,
    );

    if (error) {
      setErrorMsg(error);
      return;
    }

    if (data?.id) {
      setCategoryId(data.id);
    }

    setIsCreatingCategory(false);
    setNewCategoryName("");
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      handleAddCategory();
    }
  };

  const startLongPress = (c: { id: string; name: string }) => {
    isLongPressed.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressed.current = true;
      triggerHaptic();
      setIsCreatingCategory(false);
      setCategoryToDelete(c);
    }, 500);
  };

  const stopLongPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleCategoryClick = (cId: string) => {
    if (isLongPressed.current) {
      isLongPressed.current = false;
      return;
    }
    triggerHaptic();
    setCategoryId(categoryId === cId ? "" : cId);
  };

  const handleDeleteCategory = async () => {
    triggerHaptic();
    if (!categoryToDelete) return;

    if (deleteCategory) {
      const { error } = await deleteCategory(categoryToDelete.id);
      if (error) {
        setErrorMsg(error);
        setCategoryToDelete(null);
        return;
      }
    }

    if (categoryId === categoryToDelete.id) {
      setCategoryId("");
    }
    setCategoryToDelete(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    if (!title.trim()) {
      setErrorMsg("タスク名を入力してください");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);

    const { error } = await onSubmit({
      title: title.trim(),
      categoryId: categoryId || null,
      scheduledAt: scheduledAt
        ? new Date(`${scheduledAt}T00:00:00`).toISOString()
        : null,
      rewardPoints: rewardPoints === "" ? 0 : rewardPoints,
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
        className="flex items-center justify-center gap-2 w-full py-3 bg-sky-400 text-white font-semibold rounded-xl shadow-sm hover:bg-sky-500 active:bg-sky-600 transition-colors"
      >
        <Plus size={18} />
        新しいタスクを作成
      </button>
    );
  }

  const formContent = (
    <div
      className={
        isEditing
          ? "bg-white rounded-xl shadow-xl p-4 w-full max-w-md"
          : "bg-white rounded-xl shadow-sm p-4"
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sky-800">
            {isEditing ? "タスクを編集" : "新しいタスク"}
          </h3>
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              resetForm();
              if (isEditing && onCancelEdit) onCancelEdit();
              else onToggle();
            }}
            className="p-1 rounded-full hover:bg-sky-50 text-sky-400"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-sky-600 font-medium">カテゴリ</label>
          <div className="flex flex-wrap gap-2 mb-1">
            {categories.map((c) => {
              const isSelected = categoryId === c.id;
              const categoryColor = c.color || "#38bdf8";

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleCategoryClick(c.id)}
                  onTouchStart={() => startLongPress(c)}
                  onTouchEnd={stopLongPress}
                  onTouchMove={stopLongPress}
                  onMouseDown={() => startLongPress(c)}
                  onMouseUp={stopLongPress}
                  onMouseLeave={stopLongPress}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    triggerHaptic();
                    setCategoryToDelete(c);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors select-none"
                  style={{
                    backgroundColor: isSelected ? categoryColor : "white",
                    color: isSelected ? "white" : categoryColor,
                    borderColor: isSelected ? "transparent" : categoryColor,
                    WebkitTouchCallout: "none",
                  }}
                >
                  {c.name}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setCategoryToDelete(null);
                setIsCreatingCategory(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-sky-400 bg-white border border-dashed border-sky-300 rounded-full hover:bg-sky-50 transition-colors"
            >
              <Plus size={14} />
              新規
            </button>
          </div>

          {/* カテゴリの新規作成・削除は、別レイヤーのモーダルを重ねず
              同じフォームパネル内にインライン表示する(ネストしたモーダルを避けるため) */}
          {isCreatingCategory && (
            <div className="flex flex-col gap-2 p-3 bg-sky-50 rounded-lg border border-sky-100 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-sky-800">
                  カテゴリを新規作成
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setIsCreatingCategory(false);
                    setNewCategoryName("");
                  }}
                  className="p-1 rounded-full hover:bg-white text-sky-400"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={handleCategoryKeyDown}
                  placeholder="新しいカテゴリ名"
                  autoFocus
                  className="flex-1 border border-sky-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
                <input
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-sky-200 cursor-pointer p-1 bg-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="flex-1 py-2 text-sm font-semibold bg-sky-400 text-white rounded-lg hover:bg-sky-500 transition-colors"
                >
                  追加して選択
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setIsCreatingCategory(false);
                    setNewCategoryName("");
                  }}
                  className="flex-1 py-2 text-sm font-semibold bg-white text-sky-600 rounded-lg border border-sky-200 hover:bg-sky-50 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {categoryToDelete && (
            <div className="flex flex-col gap-3 p-3 bg-red-50 rounded-lg border border-red-100 animate-in fade-in duration-150">
              <p className="text-sm font-bold text-slate-800 text-center">
                「{categoryToDelete.name}」を削除しますか？
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDeleteCategory}
                  className="flex-1 py-2 text-sm font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  削除する
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setCategoryToDelete(null);
                  }}
                  className="flex-1 py-2 text-sm font-semibold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>

        {/* タスク名 */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タスク名"
          className="border border-sky-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
        />

        {/* 予定日（日付入力用のプレースホルダーハック） */}
        <input
          type="date"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className={`border border-sky-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 ${!scheduledAt ? "text-slate-400" : "text-slate-900"}`}
          // 未入力時に「予定日（任意）」と表示させるための疑似プレースホルダー
          data-placeholder="予定日（任意）"
          style={
            {
              // input[type="date"]が空の時にdata-placeholderの文字を出すCSS小技
              // (※ブラウザ依存があるため、Tailwindのみで完全対応は難しいですが、実用範囲です)
            }
          }
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
          input[type="date"]:empty::before {
            content: attr(data-placeholder);
            color: #94a3b8; /* text-slate-400 */
          }
          input[type="date"]:focus::before,
          input[type="date"]:valid::before {
            content: "";
          }
        `,
          }}
        />

        {/* ポイント（RewardFormに似た横並びレイアウト） */}
        <div className="flex items-center gap-2">
          <Coins className="text-sky-400 shrink-0" size={20} />
          <input
            type="number"
            min={0}
            value={rewardPoints}
            onChange={(e) => {
              const val = e.target.value;
              setRewardPoints(val === "" ? "" : Number(val));
            }}
            placeholder="獲得いちご"
            className="w-28 border border-sky-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
          <span className="text-sm font-bold text-sky-600">いちご</span>
        </div>

        {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 py-2.5 bg-sky-400 text-white font-semibold rounded-xl shadow-sm hover:bg-sky-500 active:bg-sky-600 transition-colors disabled:opacity-50"
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
        onClose={() => {
          triggerHaptic();
          resetForm();
          onCancelEdit?.();
        }}
        overlayClassName="z-40"
        contentClassName="w-full max-w-md"
      >
        {formContent}
      </Modal>
    );
  }

  return formContent;
};
