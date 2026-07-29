import { useEffect, useRef, useState } from "react";
import {
  Icon,
  Sparkles,
  X,
  Loader2,
  AlertCircle,
  Trash2,
  Plus,
  Pencil,
} from "lucide-react";
import { strawberry } from "@lucide/lab";
import { NumberStepper } from "../ui/NumberStepper";
import { useTask } from "../../hooks/useTask";
import { useCategory } from "../../hooks/useCategory";
import { useHaptic } from "../../hooks/useHaptic";
import { generateTaskOperations } from "../../lib/geminiClient";
import type { AiTaskOperationDraft, AiTaskOperationKind } from "../../types";

interface AiTaskAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  // 画面下の常設入力欄から呼び出された場合に渡される、送信済みのテキスト。
  // 渡された場合はモーダルを開いた直後に自動で生成を実行し、プレビューへ進む。
  initialInputText?: string;
  autoGenerate?: boolean;
}

// カテゴリを新規作成する場合の自動配色。既存の新規作成UI(TaskForm)の
// デフォルト色と衝突しないよう、複数バリエーションを順番に割り当てる。
const NEW_CATEGORY_COLORS = [
  "#38bdf8",
  "#fb923c",
  "#a78bfa",
  "#34d399",
  "#f472b6",
  "#fbbf24",
];

const NEW_CATEGORY_PREFIX = "__new__:";

let draftKeySeed = 0;
const nextDraftKey = () => `ai-op-${Date.now()}-${draftKeySeed++}`;

const formatDateJst = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(d);
};

interface EditableOperation {
  key: string;
  kind: AiTaskOperationKind;
  included: boolean;
  reason: string | null;
  taskId: string | null; // update / delete
  originalTitle: string | null; // update / delete の表示用（元のタスク名）
  title: string; // create / update で使用
  rewardPoints: number | "";
  scheduledAt: string; // "" or "YYYY-MM-DD"
  // "" = カテゴリなし / 既存カテゴリのid / `__new__:<name>` = 新規作成
  categorySelection: string;
  suggestedNewCategoryName: string | null;
}

type Phase = "input" | "preview";

export const AiTaskAgentModal = ({
  isOpen,
  onClose,
  initialInputText,
  autoGenerate,
}: AiTaskAgentModalProps) => {
  const triggerHaptic = useHaptic();
  const { tasks, createTasksBulk, updateTask, deleteTask } = useTask();
  const { categories, addCategory } = useCategory();

  const [phase, setPhase] = useState<Phase>("input");
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [operations, setOperations] = useState<EditableOperation[]>([]);

  const resetAll = () => {
    setPhase("input");
    setInputText("");
    setIsGenerating(false);
    setIsSubmitting(false);
    setErrorMsg(null);
    setOperations([]);
  };

  const handleClose = () => {
    triggerHaptic();
    resetAll();
    onClose();
  };

  // 常設入力欄から開かれた場合、開いた直後に一度だけ自動で生成を実行する。
  const autoTriggeredRef = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      autoTriggeredRef.current = false;
      return;
    }
    if (autoGenerate && initialInputText && !autoTriggeredRef.current) {
      autoTriggeredRef.current = true;
      setInputText(initialInputText);
      void handleGenerate(initialInputText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, autoGenerate, initialInputText]);

  const findCategoryIdByName = (name: string) =>
    categories.find((c) => c.name === name)?.id ?? null;

  const buildCategorySelection = (
    categoryName: string | null,
  ): { selection: string; suggestedNewCategoryName: string | null } => {
    if (!categoryName) return { selection: "", suggestedNewCategoryName: null };
    const existingId = findCategoryIdByName(categoryName);
    if (existingId)
      return { selection: existingId, suggestedNewCategoryName: null };
    return {
      selection: `${NEW_CATEGORY_PREFIX}${categoryName}`,
      suggestedNewCategoryName: categoryName,
    };
  };

  const toEditableOperation = (d: AiTaskOperationDraft): EditableOperation => {
    if (d.operation === "create") {
      const { selection, suggestedNewCategoryName } = buildCategorySelection(
        d.categoryName,
      );
      return {
        key: nextDraftKey(),
        kind: "create",
        included: true,
        reason: d.reason,
        taskId: null,
        originalTitle: null,
        title: d.title ?? "",
        rewardPoints: d.rewardPoints ?? 10,
        scheduledAt: d.scheduledAt ?? "",
        categorySelection: selection,
        suggestedNewCategoryName,
      };
    }

    if (d.operation === "delete") {
      return {
        key: nextDraftKey(),
        kind: "delete",
        included: false, // 削除は既定でOFF。明示的にチェックしてもらう
        reason: d.reason,
        taskId: d.taskId,
        originalTitle: d.matchedTask?.title ?? null,
        title: d.matchedTask?.title ?? "",
        rewardPoints: d.matchedTask?.reward_points ?? "",
        scheduledAt: formatDateJst(d.matchedTask?.scheduled_at ?? null),
        categorySelection: "",
        suggestedNewCategoryName: null,
      };
    }

    // update: AIが提案した差分と元のタスクをマージしてプレビュー用の値を作る
    const original = d.matchedTask;
    const mergedTitle = d.title ?? original?.title ?? "";
    const mergedRewardPoints = d.rewardPoints ?? original?.reward_points ?? "";
    const mergedScheduledAt = d.clearScheduledAt
      ? ""
      : (d.scheduledAt ?? formatDateJst(original?.scheduled_at ?? null));

    let categorySelection = "";
    let suggestedNewCategoryName: string | null = null;
    if (d.clearCategory) {
      categorySelection = "";
    } else if (d.categoryName) {
      const built = buildCategorySelection(d.categoryName);
      categorySelection = built.selection;
      suggestedNewCategoryName = built.suggestedNewCategoryName;
    } else {
      categorySelection = original?.category_id ?? "";
    }

    return {
      key: nextDraftKey(),
      kind: "update",
      included: true,
      reason: d.reason,
      taskId: d.taskId,
      originalTitle: original?.title ?? null,
      title: mergedTitle,
      rewardPoints: mergedRewardPoints,
      scheduledAt: mergedScheduledAt,
      categorySelection,
      suggestedNewCategoryName,
    };
  };

  const handleGenerate = async (textOverride?: string) => {
    triggerHaptic();
    const text = textOverride ?? inputText;
    if (!text.trim()) {
      setErrorMsg("お願いしたい内容を入力してください");
      return;
    }
    setErrorMsg(null);
    setIsGenerating(true);

    try {
      const results = await generateTaskOperations(
        text,
        categories.map((c) => ({ id: c.id, name: c.name })),
        tasks,
      );

      setOperations(results.map(toEditableOperation));
      setPhase("preview");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "生成に失敗しました");
    } finally {
      setIsGenerating(false);
    }
  };

  const updateOperation = (
    key: string,
    updates: Partial<EditableOperation>,
  ) => {
    setOperations((prev) =>
      prev.map((o) => (o.key === key ? { ...o, ...updates } : o)),
    );
  };

  const removeOperation = (key: string) => {
    triggerHaptic();
    setOperations((prev) => prev.filter((o) => o.key !== key));
  };

  const creates = operations.filter((o) => o.kind === "create");
  const updates = operations.filter((o) => o.kind === "update");
  const deletes = operations.filter((o) => o.kind === "delete");
  const includedCount = operations.filter((o) => o.included).length;

  const resolveCategoryId = (
    selection: string,
    createdNameToId: Map<string, string>,
  ): string | null => {
    if (!selection) return null;
    if (selection.startsWith(NEW_CATEGORY_PREFIX)) {
      const name = selection.slice(NEW_CATEGORY_PREFIX.length);
      return createdNameToId.get(name) ?? null;
    }
    return selection;
  };

  const handleExecute = async () => {
    triggerHaptic();
    const targetCreates = creates.filter((o) => o.included);
    const targetUpdates = updates.filter((o) => o.included);
    const targetDeletes = deletes.filter((o) => o.included);

    if (
      targetCreates.length === 0 &&
      targetUpdates.length === 0 &&
      targetDeletes.length === 0
    ) {
      setErrorMsg("実行する操作を1件以上選択してください");
      return;
    }
    if (
      targetCreates.some((o) => !o.title.trim()) ||
      targetUpdates.some((o) => !o.title.trim())
    ) {
      setErrorMsg("タスク名が未入力の項目があります");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      // 新規カテゴリ提案は重複作成しないよう、名前ごとに一度だけ作成する
      const newCategoryNames = Array.from(
        new Set(
          [...targetCreates, ...targetUpdates]
            .filter((o) => o.categorySelection.startsWith(NEW_CATEGORY_PREFIX))
            .map((o) => o.categorySelection.slice(NEW_CATEGORY_PREFIX.length)),
        ),
      );

      const createdNameToId = new Map<string, string>();
      for (let i = 0; i < newCategoryNames.length; i++) {
        const name = newCategoryNames[i];
        const color = NEW_CATEGORY_COLORS[i % NEW_CATEGORY_COLORS.length];
        const { data, error } = await addCategory(name, color);
        if (error || !data) {
          throw new Error(error ?? `カテゴリ「${name}」の作成に失敗しました`);
        }
        createdNameToId.set(name, data.id);
      }

      const failures: string[] = [];

      // 1. 新規作成（まとめてinsert）
      if (targetCreates.length > 0) {
        const rows = targetCreates.map((o) => ({
          title: o.title.trim(),
          categoryId: resolveCategoryId(o.categorySelection, createdNameToId),
          rewardPoints: o.rewardPoints === "" ? 0 : o.rewardPoints,
          scheduledAt: o.scheduledAt
            ? new Date(`${o.scheduledAt}T00:00:00`).toISOString()
            : null,
        }));
        const { error } = await createTasksBulk(rows);
        if (error) failures.push(`新規作成: ${error}`);
      }

      // 2. 編集（1件ずつ）
      for (const o of targetUpdates) {
        if (!o.taskId) continue;
        const { error } = await updateTask(o.taskId, {
          title: o.title.trim(),
          categoryId: resolveCategoryId(o.categorySelection, createdNameToId),
          rewardPoints: o.rewardPoints === "" ? 0 : o.rewardPoints,
          scheduledAt: o.scheduledAt
            ? new Date(`${o.scheduledAt}T00:00:00`).toISOString()
            : null,
        });
        if (error) failures.push(`「${o.title}」の編集: ${error}`);
      }

      // 3. 削除（1件ずつ）
      for (const o of targetDeletes) {
        if (!o.taskId) continue;
        const { error } = await deleteTask(o.taskId);
        if (error) failures.push(`「${o.originalTitle}」の削除: ${error}`);
      }

      if (failures.length > 0) {
        setErrorMsg(`一部の操作に失敗しました: ${failures.join(" / ")}`);
        return;
      }

      resetAll();
      onClose();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "実行に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categorySelect = (o: EditableOperation) => (
    <select
      value={o.categorySelection}
      onChange={(e) =>
        updateOperation(o.key, { categorySelection: e.target.value })
      }
      className="border border-sky-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
    >
      <option value="">カテゴリなし</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
      {o.suggestedNewCategoryName && (
        <option value={`${NEW_CATEGORY_PREFIX}${o.suggestedNewCategoryName}`}>
          新規作成:「{o.suggestedNewCategoryName}」
        </option>
      )}
    </select>
  );

  const editableFieldsRow = (o: EditableOperation) => (
    <div className="flex flex-wrap items-center gap-2 pl-6">
      {categorySelect(o)}

      <input
        type="date"
        value={o.scheduledAt}
        onChange={(e) =>
          updateOperation(o.key, { scheduledAt: e.target.value })
        }
        className="border border-sky-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-300 text-slate-700"
      />

      <div className="flex items-center gap-1">
        <Icon
          iconNode={strawberry}
          className="text-sky-400 shrink-0"
          size={16}
        />
        <NumberStepper
          value={o.rewardPoints}
          onChange={(v) => updateOperation(o.key, { rewardPoints: v })}
          min={0}
          size="sm"
        />
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="bg-white rounded-xl shadow-md border border-sky-100 p-4 flex flex-col gap-3 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <h3 className="font-bold text-sky-800 flex items-center gap-1.5">
          <Sparkles size={18} className="text-sky-400" />
          AIにタスクをお願いする
        </h3>
        <button
          type="button"
          onClick={handleClose}
          className="p-1 rounded-full hover:bg-sky-50 text-sky-400"
        >
          <X size={18} />
        </button>
      </div>

      {phase === "input" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-slate-500 leading-relaxed">
            やってほしいことを、文章のまま自由に入力してください。新しいタスクの追加だけでなく、「〇〇の期限を明日に変更して」「△△はもういらないから削除して」のような既存タスクの編集・削除もまとめてお願いできます。
          </p>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              "例）明日までに漢字ドリルを2ページお願い。あと部屋の片付けの期限を今週金曜に変更して、もう使わない「自転車の練習」は削除して。"
            }
            rows={5}
            autoFocus
            className="w-full border border-sky-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
          />

          {errorMsg && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle size={14} className="shrink-0" />
              {errorMsg}
            </p>
          )}

          <button
            type="button"
            onClick={() => handleGenerate()}
            disabled={isGenerating}
            className="w-full py-2.5 bg-sky-400 text-white font-semibold rounded-xl shadow-sm hover:bg-sky-500 active:bg-sky-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                内容を考え中...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                内容を確認する
              </>
            )}
          </button>
        </div>
      )}

      {phase === "preview" && (
        <div className="flex flex-col gap-3 overflow-hidden">
          <p className="text-xs text-slate-500">
            内容を確認・編集してから実行してください。削除は既定でチェックが外れています。必要な項目だけチェックを入れてください。
          </p>

          <div className="flex flex-col gap-4 overflow-y-auto pr-1 -mr-1 max-h-[55vh]">
            {operations.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">
                候補がありません
              </p>
            )}

            {/* 新規作成 */}
            {creates.length > 0 && (
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-bold text-sky-700 flex items-center gap-1">
                  <Plus size={14} />
                  新規作成（{creates.length}件）
                </h4>
                {creates.map((o) => (
                  <div
                    key={o.key}
                    className={`flex flex-col gap-2 p-3 rounded-lg border transition-colors ${
                      o.included
                        ? "bg-sky-50/60 border-sky-100"
                        : "bg-slate-50 border-slate-100 opacity-60"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={o.included}
                        onChange={(e) =>
                          updateOperation(o.key, {
                            included: e.target.checked,
                          })
                        }
                        className="mt-2 w-4 h-4 accent-sky-400 shrink-0"
                      />
                      <input
                        type="text"
                        value={o.title}
                        onChange={(e) =>
                          updateOperation(o.key, { title: e.target.value })
                        }
                        placeholder="タスク名"
                        className="flex-1 border border-sky-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
                      />
                      <button
                        type="button"
                        onClick={() => removeOperation(o.key)}
                        className="p-2 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-400 transition-colors shrink-0"
                        aria-label="この候補を削除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {o.reason && (
                      <p className="text-[11px] text-sky-500 pl-6">
                        {o.reason}
                      </p>
                    )}
                    {editableFieldsRow(o)}
                  </div>
                ))}
              </div>
            )}

            {/* 編集 */}
            {updates.length > 0 && (
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-bold text-amber-700 flex items-center gap-1">
                  <Pencil size={14} />
                  編集（{updates.length}件）
                </h4>
                {updates.map((o) => (
                  <div
                    key={o.key}
                    className={`flex flex-col gap-2 p-3 rounded-lg border transition-colors ${
                      o.included
                        ? "bg-amber-50/60 border-amber-100"
                        : "bg-slate-50 border-slate-100 opacity-60"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={o.included}
                        onChange={(e) =>
                          updateOperation(o.key, {
                            included: e.target.checked,
                          })
                        }
                        className="mt-2 w-4 h-4 accent-amber-400 shrink-0"
                      />
                      <div className="flex-1 flex flex-col gap-1">
                        {o.originalTitle && o.originalTitle !== o.title && (
                          <p className="text-[11px] text-slate-400 line-through">
                            {o.originalTitle}
                          </p>
                        )}
                        <input
                          type="text"
                          value={o.title}
                          onChange={(e) =>
                            updateOperation(o.key, {
                              title: e.target.value,
                            })
                          }
                          placeholder="タスク名"
                          className="border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeOperation(o.key)}
                        className="p-2 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-400 transition-colors shrink-0"
                        aria-label="この候補を削除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {o.reason && (
                      <p className="text-[11px] text-amber-600 pl-6">
                        {o.reason}
                      </p>
                    )}
                    {editableFieldsRow(o)}
                  </div>
                ))}
              </div>
            )}

            {/* 削除 */}
            {deletes.length > 0 && (
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-bold text-red-600 flex items-center gap-1">
                  <Trash2 size={14} />
                  削除（{deletes.length}件）
                </h4>
                {deletes.map((o) => (
                  <div
                    key={o.key}
                    className={`flex items-start gap-2 p-3 rounded-lg border transition-colors ${
                      o.included
                        ? "bg-red-50 border-red-100"
                        : "bg-slate-50 border-slate-100 opacity-70"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={o.included}
                      onChange={(e) =>
                        updateOperation(o.key, {
                          included: e.target.checked,
                        })
                      }
                      className="mt-1 w-4 h-4 accent-red-400 shrink-0"
                    />
                    <div className="flex-1 flex flex-col gap-0.5">
                      <p className="text-sm font-bold text-slate-800">
                        「{o.originalTitle}」を削除する
                      </p>
                      {o.reason && (
                        <p className="text-[11px] text-red-500">{o.reason}</p>
                      )}
                      <p className="text-[11px] text-slate-400">
                        一度削除すると元に戻せません。
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {errorMsg && (
            <p className="text-xs text-red-500 flex items-center gap-1 shrink-0">
              <AlertCircle size={14} className="shrink-0" />
              {errorMsg}
            </p>
          )}

          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setPhase("input");
                setErrorMsg(null);
              }}
              className="flex-1 py-2.5 text-sm font-semibold bg-white text-sky-600 rounded-xl border border-sky-200 hover:bg-sky-50 transition-colors"
            >
              入力に戻る
            </button>
            <button
              type="button"
              onClick={handleExecute}
              disabled={isSubmitting || includedCount === 0}
              className="flex-[2] py-2.5 text-sm font-semibold bg-sky-400 text-white rounded-xl shadow-sm hover:bg-sky-500 active:bg-sky-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  実行中...
                </>
              ) : (
                `選択した${includedCount}件を実行する`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
