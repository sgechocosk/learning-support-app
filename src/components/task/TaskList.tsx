import { Hourglass } from "lucide-react";
import type { Category, Task } from "../../types";
import { TaskItem } from "./TaskItem";
import { AiOperationCard } from "./AiOperationCard";
import type { EditableOperation } from "../../hooks/useAiTaskAgent";

interface TaskListProps {
  tasks: Task[];
  isLoading: boolean;
  isSupporter: boolean;
  onComplete: (taskId: string) => void;
  onClaimPoints: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  // AIによるタスク操作のレビュー中に渡される追加情報。
  // 新規作成の提案は一覧の先頭に、編集/削除の提案は対象タスクと同じ位置に差し込んで表示する。
  aiCreates?: EditableOperation[];
  aiOperationsByTaskId?: Map<string, EditableOperation>;
  aiCategories?: Category[];
  isAiReviewActive?: boolean;
  onAiOperationChange?: (
    key: string,
    updates: Partial<EditableOperation>,
  ) => void;
  onAiOperationRemove?: (key: string) => void;
}

export const TaskList = ({
  tasks,
  isLoading,
  isSupporter,
  onComplete,
  onClaimPoints,
  onEdit,
  onDelete,
  aiCreates = [],
  aiOperationsByTaskId,
  aiCategories = [],
  isAiReviewActive = false,
  onAiOperationChange,
  onAiOperationRemove,
}: TaskListProps) => {
  if (isLoading) {
    return (
      <p className="text-center text-sky-400 text-sm py-8">読み込み中...</p>
    );
  }

  if (tasks.length === 0 && aiCreates.length === 0) {
    if (isSupporter) {
      return (
        <p className="text-center text-sky-400 text-sm py-8">
          タスクはまだありません
        </p>
      );
    }

    return (
      <div className="flex items-center justify-center min-h-[50vh] px-4">
        <div className="flex flex-col items-center text-center gap-2 bg-white border border-sky-100 shadow-sm rounded-2xl px-8 py-10 max-w-xs w-full">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-sky-50 text-sky-400 mb-1">
            <Hourglass size={22} />
          </div>
          <p className="text-slate-600 font-bold text-sm">
            今はタスクがありません
          </p>
          <p className="text-slate-400 text-xs leading-relaxed">
            新しいタスクが追加されるまで待つか、
            <br />
            タイマーを活用して作業を進めましょう
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* 新規作成の提案は一覧の先頭にカードとして差し込む（既存タスクは隠さない） */}
      {aiCreates.map((op) => (
        <AiOperationCard
          key={op.key}
          operation={op}
          categories={aiCategories}
          onChange={(updates) => onAiOperationChange?.(op.key, updates)}
          onRemove={() => onAiOperationRemove?.(op.key)}
        />
      ))}

      {tasks.map((task, index) => {
        const op = aiOperationsByTaskId?.get(task.id);
        if (op) {
          // 編集・削除の提案は、対象タスクと同じ位置に置き換えて表示する
          return (
            <AiOperationCard
              key={task.id}
              operation={op}
              categories={aiCategories}
              onChange={(updates) => onAiOperationChange?.(op.key, updates)}
              onRemove={() => onAiOperationRemove?.(op.key)}
            />
          );
        }

        return (
          <TaskItem
            key={task.id}
            task={task}
            isSupporter={isSupporter}
            isFirst={index === 0}
            onComplete={onComplete}
            onClaimPoints={onClaimPoints}
            onEdit={onEdit}
            onDelete={onDelete}
            locked={isAiReviewActive}
          />
        );
      })}
    </div>
  );
};
