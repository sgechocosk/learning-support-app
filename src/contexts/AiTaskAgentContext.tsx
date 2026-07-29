import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  useAiTaskAgent,
  type EditableOperation,
} from "../hooks/useAiTaskAgent";
import type { Category } from "../types";

interface AiTaskAgentContextValue {
  isReviewActive: boolean;
  isGenerating: boolean;
  submit: (text: string) => void;
  cancelReview: () => void;
  executeReview: () => void;
  categories: Category[];
  errorMsg: string | null;
  isSubmitting: boolean;
  creates: EditableOperation[];
  operationsByTaskId: Map<string, EditableOperation>;
  includedCount: number;
  updateOperation: (key: string, updates: Partial<EditableOperation>) => void;
  removeOperation: (key: string) => void;
}

const AiTaskAgentContext = createContext<AiTaskAgentContextValue | null>(null);

// AIタスクエージェントの状態（入力内容・生成中フラグ・レビュー中の提案など）を
// タスク画面（Task.tsx）よりも上のレベルで保持するためのProvider。
// タブ切り替え時にTask.tsxがアンマウントされても、この状態自体は消えない。
export const AiTaskAgentProvider = ({ children }: { children: ReactNode }) => {
  const [isReviewActive, setIsReviewActive] = useState(false);
  const [inputText, setInputText] = useState("");
  const [requestToken, setRequestToken] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const {
    categories,
    errorMsg,
    isSubmitting,
    creates,
    updates,
    deletes,
    includedCount,
    updateOperation,
    removeOperation,
    handleExecute,
    cancel,
  } = useAiTaskAgent({
    isActive: isReviewActive,
    inputText,
    requestToken,
    onGeneratingChange: setIsGenerating,
  });

  // 編集・削除の提案を対象タスクIDで引けるようにしておく
  const operationsByTaskId = useMemo(() => {
    const map = new Map<string, EditableOperation>();
    for (const op of updates) {
      if (op.taskId) map.set(op.taskId, op);
    }
    for (const op of deletes) {
      if (op.taskId) map.set(op.taskId, op);
    }
    return map;
  }, [updates, deletes]);

  const submit = (text: string) => {
    setInputText(text);
    setIsReviewActive(true);
    setRequestToken((t) => t + 1);
  };

  const cancelReview = () => cancel(() => setIsReviewActive(false));
  const executeReview = () => handleExecute(() => setIsReviewActive(false));

  return (
    <AiTaskAgentContext.Provider
      value={{
        isReviewActive,
        isGenerating,
        submit,
        cancelReview,
        executeReview,
        categories,
        errorMsg,
        isSubmitting,
        creates,
        operationsByTaskId,
        includedCount,
        updateOperation,
        removeOperation,
      }}
    >
      {children}
    </AiTaskAgentContext.Provider>
  );
};

export const useAiTaskAgentContext = () => {
  const ctx = useContext(AiTaskAgentContext);
  if (!ctx) {
    throw new Error(
      "useAiTaskAgentContext は AiTaskAgentProvider の内側でのみ使用できます",
    );
  }
  return ctx;
};
