import type { Task } from "../../types";
import { TaskItem } from "./TaskItem";

interface TaskListProps {
  tasks: Task[];
  isLoading: boolean;
  isSupporter: boolean;
  onComplete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export const TaskList = ({
  tasks,
  isLoading,
  isSupporter,
  onComplete,
  onEdit,
  onDelete,
}: TaskListProps) => {
  if (isLoading) {
    return (
      <p className="text-center text-sky-400 text-sm py-8">読み込み中...</p>
    );
  }

  if (tasks.length === 0) {
    return (
      <p className="text-center text-sky-400 text-sm py-8">
        タスクはまだありません
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          isSupporter={isSupporter}
          onComplete={onComplete}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
