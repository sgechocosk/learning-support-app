import { useRef } from "react";
import {
  Pencil,
  Trash2,
  Calendar,
  Star,
  Tag,
  CheckCircle2,
  Circle,
  Gift,
} from "lucide-react";
import type { Task } from "../../types";
import { useHaptic } from "../../hooks/useHaptic";

const ANIMATION_STYLE = `
  @keyframes peel-top {
    0%, 100% { transform: rotateZ(1deg) rotateY(-2deg) rotateX(2deg); }
    50% { transform: rotateZ(6deg) rotateY(-10deg) rotateX(8deg); }
  }
  .stub-bottom-attached {
    transform-origin: bottom left;
    animation: peel-top 3.5s ease-in-out infinite;
  }
`;

interface TaskItemProps {
  task: Task;
  isSupporter: boolean;
  onComplete: (taskId: string) => void;
  onClaimPoints: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export const TaskItem = ({
  task,
  isSupporter,
  onComplete,
  onClaimPoints,
  onEdit,
  onDelete,
}: TaskItemProps) => {
  const triggerHaptic = useHaptic();
  const stubRef = useRef<HTMLDivElement>(null);
  const isAnimating = useRef(false);

  const categoryColor = task.categories?.color ?? "#e0f2fe";
  const categoryName = task.categories?.name ?? "未分類";

  const canClaimPoints =
    !isSupporter && task.is_completed && !task.points_awarded_at;
  const isClaimed = !!task.points_awarded_at;

  const formattedDate = task.scheduled_at
    ? new Date(task.scheduled_at).toLocaleDateString("ja-JP", {
        year:
          new Date(task.scheduled_at).getFullYear() === new Date().getFullYear()
            ? undefined
            : "numeric",
        month: "numeric",
        day: "numeric",
      })
    : "--/--";

  const isToday = (() => {
    if (!task.scheduled_at) return false;
    const scheduled = new Date(task.scheduled_at);
    const today = new Date();
    return (
      scheduled.getFullYear() === today.getFullYear() &&
      scheduled.getMonth() === today.getMonth() &&
      scheduled.getDate() === today.getDate()
    );
  })();

  const handleLeftClick = () => {
    if (!isSupporter) {
      if (isClaimed) return;
      triggerHaptic();

      if (task.is_completed) {
        if (window.confirm("タスクの完了を取り消しますか？")) {
          onComplete(task.id);
        }
      } else {
        onComplete(task.id);
      }
    }
  };

  const handleClaimClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canClaimPoints && !isAnimating.current) {
      triggerHaptic();
      if (window.confirm("いちごを受け取りますか？")) {
        if (stubRef.current) {
          isAnimating.current = true;
          const stub = stubRef.current;
          const computedStyle = window.getComputedStyle(stub);
          const currentTransform = computedStyle.transform;
          stub.style.animation = "none";

          const animation = stub.animate(
            [
              { transform: currentTransform, opacity: 1 },
              {
                transform:
                  "translate(40px, 50px) rotateZ(15deg) rotateY(-15deg) rotateX(10deg)",
                opacity: 0,
              },
            ],
            {
              duration: 800,
              easing: "ease-out",
              fill: "forwards",
            },
          );

          await animation.finished;
          stub.style.animation = "";
          isAnimating.current = false;
        }
        onClaimPoints(task.id);
      }
    }
  };

  if (isSupporter) {
    return (
      <div
        className={`flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 rounded-xl border-2 border-slate-100 shadow-sm transition-all ${
          task.is_completed
            ? "opacity-60 grayscale-[0.2] bg-slate-50"
            : "bg-white"
        }`}
      >
        <div className="flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-1 rounded-md shrink-0">
          <Calendar size={12} />
          <span className="text-[10px] font-bold tracking-wider whitespace-nowrap">
            {formattedDate}
          </span>
        </div>

        <span
          className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold text-white shadow-sm shrink-0"
          style={{ backgroundColor: categoryColor }}
        >
          <Tag size={10} />
          <span className="truncate max-w-[64px]">{categoryName}</span>
        </span>

        <span className="flex items-center shrink-0 text-sky-500 text-sm font-black ml-auto">
          +{task.reward_points}コ
        </span>

        {!task.is_completed && (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => {
                triggerHaptic();
                onEdit(task);
              }}
              className="p-1.5 rounded-full bg-slate-100 text-sky-500 transition-colors"
            >
              <Pencil size={24} />
            </button>
            <button
              onClick={() => {
                triggerHaptic();
                onDelete(task.id);
              }}
              className="p-1.5 rounded-full bg-slate-100 text-red-400 transition-colors"
            >
              <Trash2 size={24} />
            </button>
          </div>
        )}

        {isClaimed && (
          <span className="shrink-0 text-[10px] font-black text-red-500/70 border-2 border-red-500/50 rounded px-1.5 py-0.5">
            GET!
          </span>
        )}

        <p
          className={`w-full basis-full font-bold text-base break-words ${
            task.is_completed ? "line-through text-slate-400" : "text-slate-700"
          }`}
        >
          {task.title}
        </p>
      </div>
    );
  }

  return (
    <>
      <style>{ANIMATION_STYLE}</style>
      <div
        className={`group relative flex flex-row transition-all [perspective:1000px] ${
          task.is_completed ? "opacity-60 grayscale-[0.2]" : ""
        }`}
      >
        <div
          onClick={!isClaimed ? handleLeftClick : undefined}
          className={`p-3 sm:p-5 pl-12 sm:pl-16 flex-1 min-w-0 relative z-20 flex flex-col border-2 border-slate-100 shadow-sm rounded-l-2xl ${
            !isClaimed ? "border-r-0" : ""
          } ${task.is_completed ? "bg-slate-50" : isToday ? "bg-orange-50" : "bg-white"} ${
            !isClaimed
              ? "cursor-pointer active:scale-[0.98] transition-all"
              : ""
          }`}
        >
          <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
            {task.is_completed ? (
              <CheckCircle2
                size={28}
                className="text-sky-400 opacity-90 bg-white rounded-full"
              />
            ) : (
              <Circle
                size={28}
                className="text-slate-300 bg-white rounded-full transition-colors"
              />
            )}
          </div>

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

          {task.is_completed && !isClaimed && (
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-1">
              タップで完了を取り消す
            </p>
          )}

          {isClaimed && (
            <div className="absolute bottom-2 right-3 sm:bottom-3 sm:right-4 border-[3px] border-red-500/60 text-red-500/70 rounded-md px-2 py-1 transform -rotate-[15deg] z-30 pointer-events-none flex flex-col items-center justify-center bg-red-50/50 mix-blend-multiply">
              <span className="text-[8px] sm:text-[10px] font-black tracking-widest leading-none mb-0.5">
                GET!
              </span>
              <span className="text-sm sm:text-lg font-black leading-none">
                +{task.reward_points}コ
              </span>
            </div>
          )}

          {!isClaimed && (
            <div className="absolute -right-[2px] top-0 bottom-0 w-px border-l-2 border-dashed border-slate-200 z-30 pointer-events-none"></div>
          )}
        </div>

        <div className="relative shrink-0 w-24 sm:w-36 z-10">
          {!isClaimed && (
            <>
              <div
                ref={stubRef}
                className={`absolute inset-0 p-3 sm:p-5 flex flex-col items-center justify-center z-10 transition-colors [transform-style:preserve-3d] rounded-r-2xl border-2 border-l-0 border-slate-100 shadow-sm ${
                  task.is_completed ? "bg-white" : "bg-sky-50/50"
                } ${canClaimPoints ? "stub-bottom-attached" : ""}`}
              >
                <span
                  className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-1 sm:mb-2 ${
                    canClaimPoints ? "text-amber-600/80" : "text-sky-600/70"
                  }`}
                >
                  {canClaimPoints ? "Tap to claim" : "Reward"}
                </span>

                <div className="flex flex-col items-center">
                  <div className="flex items-baseline text-sky-500">
                    <span className="text-lg sm:text-xl font-bold mr-0.5">
                      +
                    </span>
                    <span className="text-3xl sm:text-4xl font-black">
                      {task.reward_points}
                    </span>
                    <span className="text-[10px] sm:text-xs font-bold ml-0.5 mb-1 opacity-70">
                      コ
                    </span>
                  </div>

                  {canClaimPoints ? (
                    <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 mt-1 animate-pulse" />
                  ) : (
                    <div className="flex space-x-1 mt-1 opacity-80">
                      {[
                        ...Array(
                          Math.min(
                            3,
                            Math.max(1, Math.floor(task.reward_points / 20)),
                          ),
                        ),
                      ].map((_, i) => (
                        <Star
                          key={i}
                          className="w-3 h-3 sm:w-4 sm:h-4 fill-sky-400 text-sky-400"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div
                className={`absolute inset-0 z-20 ${
                  canClaimPoints ? "cursor-pointer" : ""
                }`}
                onClick={canClaimPoints ? handleClaimClick : undefined}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
};
