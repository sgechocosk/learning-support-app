import { useMemo, useRef, useState } from "react";
import { useProfile } from "../hooks/useProfile";
import { useTask } from "../hooks/useTask";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { TaskForm } from "../components/task/TaskForm";
import { TaskList } from "../components/task/TaskList";
import { PullToRefreshIndicator } from "../components/ui/PullToRefreshIndicator";
import type { Task as TaskType } from "../types";
import { TaskTutorial, type TaskTutorialHandle } from "../tutorial/TaskTutorial";
import { TutorialHelpButton } from "../tutorial/TutorialHelpButton";
import { useSupporterTutorial } from "../tutorial/useSupporterTutorial";
import { SupporterTutorialContext } from "../tutorial/SupporterTutorialContext";

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
  const tutorialRef = useRef<TaskTutorialHandle>(null);
  const supporterTutorial = useSupporterTutorial();

  const { containerRef, pullDistance, isRefreshing, isReady } =
    usePullToRefresh<HTMLDivElement>({
      onRefresh: refreshTasks,
    });

  const isSupporter = profile?.role === "supporter";

  // タスク画面には「2週間後」よりも前のタスクのみ表示する（完了済みも含む）。
  // 予定日未設定のタスクは対象外として常に表示する。
  const visibleTasks = useMemo(() => {
    const twoWeeksLater = new Date();
    twoWeeksLater.setHours(0, 0, 0, 0);
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);

    if (isSupporter) return tasks;

    return tasks.filter((task) => {
      if (!task.scheduled_at) return true;
      return new Date(task.scheduled_at).getTime() < twoWeeksLater.getTime();
    });
  }, [tasks, isSupporter]);

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
      <div className="flex justify-end items-center gap-2">
        {!isSupporter && (
          <span
            className="text-sky-500 font-bold"
            data-tutorial-id="tutorial-points"
            style={{
              fontFamily:
                '"M PLUS Rounded 1c", "Nunito", "Quicksand", sans-serif',
            }}
          >
            たまったいちご：{profile?.points ?? 0}コ
          </span>
        )}
        {!isSupporter && visibleTasks.length > 0 && (
          <TutorialHelpButton onClick={() => tutorialRef.current?.restart()} />
        )}
      </div>

      {isSupporter && (
        <SupporterTutorialContext.Provider value={supporterTutorial}>
          <TaskForm
            isOpen={showForm}
            onToggle={() => setShowForm((v) => !v)}
            onSubmit={handleSubmit}
            editingTask={editingTask}
            onCancelEdit={() => setEditingTask(null)}
          />
          <TaskList
            tasks={visibleTasks}
            isLoading={isLoading}
            isSupporter={isSupporter}
            onComplete={completeTask}
            onClaimPoints={claimTaskPoints}
            onEdit={(task) => setEditingTask(task)}
            onDelete={handleDelete}
          />
        </SupporterTutorialContext.Provider>
      )}

      {!isSupporter && (
        <TaskList
          tasks={visibleTasks}
          isLoading={isLoading}
          isSupporter={isSupporter}
          onComplete={completeTask}
          onClaimPoints={claimTaskPoints}
          onEdit={(task) => setEditingTask(task)}
          onDelete={handleDelete}
        />
      )}

      {/* 学習者向けのみスポットライト形式のチュートリアルを使用する。
          支援者向けは各入力欄フォーカス時の吹き出し説明（TutorialFieldHint）に置き換えた。 */}
      {!isSupporter && (
        <TaskTutorial
          ref={tutorialRef}
          role="learner"
          hasTasks={visibleTasks.length > 0}
        />
      )}
    </div>
  );
}
