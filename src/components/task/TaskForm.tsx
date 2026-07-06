import { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { useCategory } from "../../hooks/useCategory";
import type { Task } from "../../types";

interface TaskFormProps {
  isOpen: boolean;
  onToggle: () => void;
  onSubmit: (input: {
    title: string;
    categoryId: string | null;
    rewardPoints: number;
    scheduledAt?: string | null;
  }) => Promise<{ error: string | null }>;
  editingTask?: Task | null; // 編集対象。nullなら新規作成
  onCancelEdit?: () => void;
}

export const TaskForm = ({
  isOpen,
  onToggle,
  onSubmit,
  editingTask = null,
  onCancelEdit,
}: TaskFormProps) => {
  const { categories, addCategory } = useCategory();

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [rewardPoints, setRewardPoints] = useState<number>(10);
  const [scheduledAt, setScheduledAt] = useState<string>("");

  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#38bdf8");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isEditing = !!editingTask;

  // 編集対象が変わったらフォームに反映
  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setCategoryId(editingTask.category_id ?? "");
      setRewardPoints(editingTask.reward_points);
      setScheduledAt(
        editingTask.scheduled_at
          ? editingTask.scheduled_at.slice(0, 16) // datetime-local用フォーマット
          : "",
      );
    }
  }, [editingTask]);

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
    if (!newCategoryName.trim()) return;
    const { error } = await addCategory(
      newCategoryName.trim(),
      newCategoryColor,
    );
    if (error) {
      setErrorMsg(error);
      return;
    }
    setIsCreatingCategory(false);
    setNewCategoryName("");
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setErrorMsg("タスク名を入力してください");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);

    const { error } = await onSubmit({
      title: title.trim(),
      categoryId: categoryId || null,
      rewardPoints,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
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
        onClick={onToggle}
        className="flex items-center justify-center gap-2 w-full py-3 bg-sky-400 text-white font-semibold rounded-xl shadow-sm hover:bg-sky-500 active:bg-sky-600 transition-colors"
      >
        <Plus size={18} />
        新しいタスクを作成
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sky-800">
          {isEditing ? "タスクを編集" : "新しいタスク"}
        </h3>
        <button
          onClick={() => {
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
        <label className="text-xs text-sky-600 font-medium">タスク名</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例: 漢字プリント1枚"
          className="border border-sky-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-sky-600 font-medium">カテゴリ</label>
        {!isCreatingCategory ? (
          <div className="flex gap-2">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="flex-1 border border-sky-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
            >
              <option value="">未分類</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setIsCreatingCategory(true)}
              className="px-3 py-2 text-sm bg-sky-50 text-sky-600 rounded-lg hover:bg-sky-100"
            >
              新規
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 border border-sky-100 rounded-lg p-2 bg-sky-50">
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="カテゴリ名"
                className="flex-1 border border-sky-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
              />
              <input
                type="color"
                value={newCategoryColor}
                onChange={(e) => setNewCategoryColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-sky-200"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddCategory}
                className="flex-1 py-1.5 text-sm bg-sky-400 text-white rounded-lg hover:bg-sky-500"
              >
                追加
              </button>
              <button
                onClick={() => setIsCreatingCategory(false)}
                className="flex-1 py-1.5 text-sm bg-white text-sky-600 rounded-lg border border-sky-200"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-sky-600 font-medium">ポイント</label>
        <input
          type="number"
          min={0}
          value={rewardPoints}
          onChange={(e) => setRewardPoints(Number(e.target.value))}
          className="border border-sky-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-sky-600 font-medium">
          予定日時（任意）
        </label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="border border-sky-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
        />
      </div>

      {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}

      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="mt-1 py-2.5 bg-sky-400 text-white font-semibold rounded-xl shadow-sm hover:bg-sky-500 active:bg-sky-600 transition-colors disabled:opacity-50"
      >
        {isSubmitting ? "保存中..." : isEditing ? "更新する" : "作成する"}
      </button>
    </div>
  );
};
