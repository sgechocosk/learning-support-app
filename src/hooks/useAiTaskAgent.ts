import { useEffect, useRef, useState } from "react";
import { useTask } from "./useTask";
import { useCategory } from "./useCategory";
import { generateTaskOperations } from "../lib/geminiClient";
import type { AiTaskOperationDraft, AiTaskOperationKind } from "../types";

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

export const NEW_CATEGORY_PREFIX = "__new__:";

let draftKeySeed = 0;
const nextDraftKey = () => `ai-op-${Date.now()}-${draftKeySeed++}`;

const formatDateJst = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(d);
};

export interface EditableOperation {
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

interface UseAiTaskAgentOptions {
  // 常設入力欄から新しい依頼が送信されるたびに増分するトークン。
  // isActiveがtrueの間、このトークンが変わるたびに自動で生成を実行する。
  isActive: boolean;
  inputText: string;
  requestToken: number;
  onGeneratingChange?: (isGenerating: boolean) => void;
}

// AIタスク操作エージェントの状態・ロジックをまとめたフック。
// 生成・編集・実行に関する内部処理（AIへのプロンプトや呼び出し方）は一切変更していない。
export const useAiTaskAgent = ({
  isActive,
  inputText,
  requestToken,
  onGeneratingChange,
}: UseAiTaskAgentOptions) => {
  const { tasks, createTasksBulk, updateTask, deleteTask } = useTask();
  const { categories, addCategory } = useCategory();

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [operations, setOperations] = useState<EditableOperation[]>([]);
  const [hasResult, setHasResult] = useState(false);

  const resetAll = () => {
    setIsGenerating(false);
    setIsSubmitting(false);
    setErrorMsg(null);
    setOperations([]);
    setHasResult(false);
  };

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

  const handleGenerate = async (text: string) => {
    if (!text.trim()) return;
    setErrorMsg(null);
    setHasResult(false);
    setIsGenerating(true);
    onGeneratingChange?.(true);

    try {
      const results = await generateTaskOperations(
        text,
        categories.map((c) => ({ id: c.id, name: c.name })),
        tasks,
      );

      setOperations(results.map(toEditableOperation));
      setHasResult(true);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "生成に失敗しました");
      setHasResult(true);
    } finally {
      setIsGenerating(false);
      onGeneratingChange?.(false);
    }
  };

  // 常設入力欄から新しい依頼が送信されるたび（requestTokenが変わるたび）に自動で生成を実行する。
  const lastTokenRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isActive) {
      lastTokenRef.current = null;
      return;
    }
    if (lastTokenRef.current === requestToken) return;
    lastTokenRef.current = requestToken;
    void handleGenerate(inputText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, requestToken]);

  const updateOperation = (
    key: string,
    updates: Partial<EditableOperation>,
  ) => {
    setOperations((prev) =>
      prev.map((o) => (o.key === key ? { ...o, ...updates } : o)),
    );
  };

  const removeOperation = (key: string) => {
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

  const handleExecute = async (onDone: () => void) => {
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
      onDone();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "実行に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancel = (onDone: () => void) => {
    resetAll();
    onDone();
  };

  return {
    categories,
    isGenerating,
    isSubmitting,
    errorMsg,
    hasResult,
    operations,
    creates,
    updates,
    deletes,
    includedCount,
    updateOperation,
    removeOperation,
    handleExecute,
    cancel,
  };
};
