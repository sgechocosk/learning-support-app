import { useState } from "react";
import PullToRefresh from "react-simple-pull-to-refresh";
import { useProfile } from "../hooks/useProfile";
import { useTask } from "../hooks/useTask";
import { TaskForm } from "../components/task/TaskForm";
import { TaskList } from "../components/task/TaskList";
import type { Task as TaskType } from "../types";

export default function Task() {
  const { profile } = useProfile();
  const {
    tasks,
    isLoading,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    claimTaskPoints,
    refreshTasks,
  } = useTask();
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskType | null>(null);

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

  const handleRefresh = async () => {
    if (refreshTasks) {
      await refreshTasks();
    }
  };

  const customPullingContent = (
    <div className="py-4 text-center text-sky-500 font-bold text-sm">
      ↓ さらに引っ張って更新 ↓
    </div>
  );

  const customRefreshingContent = (
    <div className="py-4 text-center text-sky-500 font-bold text-sm animate-pulse">
      更新中...
    </div>
  );

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      pullingContent={customPullingContent}
      refreshingContent={customRefreshingContent}
      pullDownThreshold={70}
      maxPullDownDistance={100}
      resistance={2}
    >
      <div className="flex flex-col gap-1 min-h-[calc(100vh-100px)]">
        {!isSupporter && (
          <div className="flex justify-end">
            <span
              className="text-sky-500 font-bold"
              style={{
                fontFamily:
                  '"M PLUS Rounded 1c", "Nunito", "Quicksand", sans-serif',
              }}
            >
              たまったポイント：{profile?.points ?? 0}pt
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
    </PullToRefresh>
  );
}
