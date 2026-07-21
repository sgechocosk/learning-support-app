import { useState } from "react";
import { useProfile } from "../hooks/useProfile";
import { useTask } from "../hooks/useTask";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { TaskForm } from "../components/task/TaskForm";
import { TaskList } from "../components/task/TaskList";
import { PullToRefreshIndicator } from "../components/ui/PullToRefreshIndicator";
import type { Task as TaskType } from "../types";

export default function Task() {
  const { profile } = useProfile();
  const {
    tasks,
    isLoading,
    refreshTasks,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    claimTaskPoints,
  } = useTask();
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskType | null>(null);

  const { containerRef, pullDistance, isRefreshing, isReady } =
    usePullToRefresh<HTMLDivElement>({
      onRefresh: refreshTasks,
    });

  const isSupporter = profile?.role === "supporter";

  const handleSubmit = (input: Parameters<typeof createTask>[0]) => {
    if (editingTask) {
      return updateTask(editingTask.id, input);
    }
    return createTask(input);
  };

  const handleDelete = async (taskId: string) => {
    if (!window.confirm("このタスクを削除しますか？")) return;
    await deleteTask(taskId);
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-1">
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        isReady={isReady}
      />
      {!isSupporter && (
        <div className="flex justify-end">
          <span
            className="text-sky-500 font-bold"
            style={{
              fontFamily:
                '"M PLUS Rounded 1c", "Nunito", "Quicksand", sans-serif',
            }}
          >
            たまったいちご：{profile?.points ?? 0}コ
          </span>
        </div>
      )}

      {isSupporter && (
        <TaskForm
          isOpen={showForm}
          onToggle={() => setShowForm((v) => !v)}
          onSubmit={handleSubmit}
          editingTask={editingTask}
          onCancelEdit={() => setEditingTask(null)}
        />
      )}
      <TaskList
        tasks={tasks}
        isLoading={isLoading}
        isSupporter={isSupporter}
        onComplete={completeTask}
        onClaimPoints={claimTaskPoints}
        onEdit={(task) => setEditingTask(task)}
        onDelete={handleDelete}
      />
    </div>
  );
}
