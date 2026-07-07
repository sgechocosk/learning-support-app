import {
  Pencil,
  Trash2,
  Calendar,
  Star,
  Tag,
  CheckCircle2,
  Circle,
} from "lucide-react";
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

  const formattedDate = task.scheduled_at
    ? new Date(task.scheduled_at).toLocaleDateString("ja-JP", {
        month: "numeric",
        day: "numeric",
      })
    : "--/--";

  const handleCardClick = () => {
    if (!isSupporter && !task.is_completed) {
      onComplete(task.id);
    }
  };

  return (
    <div
      onClick={!isSupporter ? handleCardClick : undefined}
      className={`group relative flex flex-row bg-white rounded-2xl border-2 transition-all overflow-hidden pl-12 sm:pl-16 ${
        !isSupporter && !task.is_completed
          ? "cursor-pointer border-slate-100 shadow-sm hover:shadow-md hover:border-sky-100 hover:-translate-y-0.5 active:scale-[0.98]"
          : "border-slate-100 shadow-sm"
      } ${task.is_completed ? "opacity-60 grayscale-[0.2] bg-slate-50" : ""}`}
    >
      {!isSupporter && (
        <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
          {task.is_completed ? (
            <CheckCircle2
              size={28}
              className="text-sky-400 opacity-90 bg-white rounded-full"
            />
          ) : (
            <Circle
              size={28}
              className="text-slate-300 bg-white rounded-full group-hover:text-sky-300 transition-colors"
            />
          )}
        </div>
      )}

      <div
        className={`p-3 sm:p-5 flex-1 min-w-0 relative z-10 flex flex-col ${task.is_completed ? "bg-slate-50" : "bg-white"}`}
      >
        <div className="flex flex-wrap justify-between items-center gap-2 mb-2 sm:mb-3">
          <div className="flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
            <Calendar size={12} className="sm:w-[14px] sm:h-[14px]" />
            <span className="text-[10px] sm:text-xs font-bold tracking-wider">
              {formattedDate}
            </span>
          </div>

          <span
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-bold text-white shadow-sm"
            style={{ backgroundColor: categoryColor }}
          >
            <Tag size={10} className="sm:w-[12px] sm:h-[12px]" />
            <span className="truncate max-w-[80px] sm:max-w-[120px]">
              {categoryName}
            </span>
          </span>
        </div>

        <div className="mt-1 mb-2 flex-1 flex items-center">
          <p
            className={`font-black text-xl sm:text-3xl tracking-tight leading-snug break-words ${
              task.is_completed
                ? "line-through text-slate-400"
                : "text-slate-700"
            }`}
          >
            {task.title}
          </p>
        </div>

        {isSupporter && (
          <div className="flex gap-2 mt-2 sm:mt-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
              className="p-1.5 sm:p-2 rounded-full bg-slate-100 hover:bg-sky-100 text-sky-500 transition-colors"
            >
              <Pencil size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              className="p-1.5 sm:p-2 rounded-full bg-slate-100 hover:bg-red-100 text-red-400 transition-colors"
            >
              <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>
        )}
      </div>

      <div className="w-px bg-dashed border-l-2 border-dashed border-slate-200 relative shrink-0">
        <div className="absolute -top-3 -left-3 w-6 h-6 bg-slate-50 rounded-full border-b-2 border-slate-200"></div>
        <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-slate-50 rounded-full border-t-2 border-slate-200"></div>
      </div>

      <div
        className={`p-3 sm:p-5 w-24 sm:w-36 shrink-0 flex flex-col items-center justify-center relative z-10 transition-colors ${
          task.is_completed
            ? "bg-slate-50"
            : "bg-sky-50/50 group-hover:bg-sky-50"
        }`}
      >
        <span className="text-[9px] sm:text-[10px] font-bold text-sky-600/70 uppercase tracking-widest mb-1 sm:mb-2">
          Reward
        </span>

        <div className="flex flex-col items-center">
          <div className="flex items-baseline text-sky-500">
            <span className="text-lg sm:text-xl font-bold mr-0.5">+</span>
            <span className="text-3xl sm:text-4xl font-black">
              {task.reward_points}
            </span>
            <span className="text-[10px] sm:text-xs font-bold ml-0.5 mb-1 text-sky-600/70">
              pt
            </span>
          </div>

          <div className="flex space-x-1 mt-1 opacity-80">
            {[
              ...Array(
                Math.min(3, Math.max(1, Math.floor(task.reward_points / 20))),
              ),
            ].map((_, i) => (
              <Star
                key={i}
                className="w-3 h-3 sm:w-4 sm:h-4 fill-sky-400 text-sky-400"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
