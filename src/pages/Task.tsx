import { useState } from "react";
import { useProfile } from "../hooks/useProfile";
import { useTask } from "../hooks/useTask";
import { TaskForm } from "../components/task/TaskForm";
import { TaskList } from "../components/task/TaskList";
import type { Task as TaskType } from "../types";

export default function Task() {
  const { profile } = useProfile();
  const { tasks, isLoading, createTask, updateTask, deleteTask, completeTask } =
    useTask();
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

  return (
    <div className="flex flex-col gap-4 p-4">
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
        onEdit={(task) => setEditingTask(task)}
        onDelete={handleDelete}
      />
    </div>
  );
}
