import { Hourglass } from "lucide-react";
import type { Task } from "../../types";
import { TaskItem } from "./TaskItem";

interface TaskListProps {
  tasks: Task[];
  isLoading: boolean;
  isSupporter: boolean;
  onComplete: (taskId: string) => void;
  onClaimPoints: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export const TaskList = ({
  tasks,
  isLoading,
  isSupporter,
  onComplete,
  onClaimPoints,
  onEdit,
  onDelete,
}: TaskListProps) => {
  if (isLoading) {
    return (
      <p className="text-center text-sky-400 text-sm py-8">読み込み中...</p>
    );
  }

  if (tasks.length === 0) {
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
            新しいタスクが追加されるまで待つか、タイマーを活用して作業を進めましょう
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task, index) => (
        <TaskItem
          key={task.id}
          task={task}
          isSupporter={isSupporter}
          isFirst={index === 0}
          onComplete={onComplete}
          onClaimPoints={onClaimPoints}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
