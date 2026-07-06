import { Check, Pencil, Trash2, Clock } from "lucide-react";
import type { Task } from "../../types";

interface TaskItemProps {
  task: Task;
  isSupporter: boolean;
  onComplete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export const TaskItem = ({
  task,
  isSupporter,
  onComplete,
  onEdit,
  onDelete,
}: TaskItemProps) => {
  const categoryColor = task.categories?.color ?? "#e0f2fe";
  const categoryName = task.categories?.name ?? "未分類";

  return (
    <div
      className={`bg-white rounded-xl shadow-sm p-4 flex items-start gap-3 ${
        task.is_completed ? "opacity-60" : ""
      }`}
    >
      {!isSupporter && (
        <button
          onClick={() => !task.is_completed && onComplete(task.id)}
          disabled={task.is_completed}
          className={`flex-none w-8 h-8 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors ${
            task.is_completed
              ? "bg-sky-400 border-sky-400 text-white"
              : "border-sky-300 text-transparent hover:bg-sky-50"
          }`}
        >
          <Check size={16} />
        </button>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: categoryColor }}
          >
            {categoryName}
          </span>
          <span className="text-xs font-bold text-sky-500">
            {task.reward_points} pt
          </span>
        </div>

        <p
          className={`font-medium text-sky-800 ${
            task.is_completed ? "line-through" : ""
          }`}
        >
          {task.title}
        </p>

        {task.scheduled_at && (
          <div className="flex items-center gap-1 mt-1 text-xs text-sky-500">
            <Clock size={12} />
            {new Date(task.scheduled_at).toLocaleString("ja-JP", {
              month: "numeric",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
      </div>

      {isSupporter && (
        <div className="flex-none flex gap-1">
          <button
            onClick={() => onEdit(task)}
            className="p-2 rounded-full hover:bg-sky-50 text-sky-500"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-2 rounded-full hover:bg-red-50 text-red-400"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
};
