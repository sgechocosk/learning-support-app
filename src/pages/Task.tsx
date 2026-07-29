import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useProfile } from "../hooks/useProfile";
import { useTask } from "../hooks/useTask";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { TaskForm } from "../components/task/TaskForm";
import { TaskList } from "../components/task/TaskList";
import { useAiTaskAgentContext } from "../contexts/AiTaskAgentContext";
import { PullToRefreshIndicator } from "../components/ui/PullToRefreshIndicator";
import type { Task as TaskType } from "../types";
import { TaskTutorial } from "../tutorial/TaskTutorial";
import { useSupporterTutorial } from "../tutorial/useSupporterTutorial";
import { SupporterTutorialContext } from "../tutorial/SupporterTutorialContext";
import { getTutorialSteps } from "../tutorial/tutorialSteps";
import { Modal } from "../components/ui/Modal";
import { useHaptic } from "../hooks/useHaptic"; // 1. useHaptic をインポート

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

  const triggerHaptic = useHaptic(); // 2. フックを初期化

  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskType | null>(null);
  const supporterTutorial = useSupporterTutorial();

  // 画面下の常設入力欄・レビュー用バーはApp.tsx側（タブ切り替えの影響を受けない場所）に
  // 常設されており、その状態はAiTaskAgentContext経由で共有される。
  const {
    isReviewActive: aiReviewActive,
    categories: aiCategories,
    creates: aiCreates,
    operationsByTaskId: aiOperationsByTaskId,
    updateOperation: handleAiOperationChange,
    removeOperation: handleAiOperationRemove,
  } = useAiTaskAgentContext();

  // 削除モーダル用の状態管理
  const [deletingTask, setDeletingTask] = useState<{
    id: string;
    title: string;
  } | null>(null);

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

  const handleDeleteRequest = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      triggerHaptic(); // 3. 削除リクエスト時に触覚をトリガー
      setDeletingTask({ id: task.id, title: task.title });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTask) return;
    triggerHaptic(); // 4. 削除確定時に触覚をトリガー
    await deleteTask(deletingTask.id);
    setDeletingTask(null);
  };

  return (
    <>
      <div
        ref={containerRef}
        className={`flex flex-col gap-1 ${isSupporter ? "pb-46" : ""}`}
      >
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
              onDelete={handleDeleteRequest}
              aiCreates={aiReviewActive ? aiCreates : []}
              aiOperationsByTaskId={
                aiReviewActive ? aiOperationsByTaskId : undefined
              }
              aiCategories={aiCategories}
              isAiReviewActive={aiReviewActive}
              onAiOperationChange={handleAiOperationChange}
              onAiOperationRemove={handleAiOperationRemove}
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
            onDelete={handleDeleteRequest}
          />
        )}

        {/* 学習者向けのみスポットライト形式のチュートリアルを使用する。
            支援者向けは各入力欄フォーカス時の吹き出し説明（TutorialFieldHint）に置き換えた。 */}
        {!isSupporter && (
          <TaskTutorial
            role="learner"
            tutorialId="task"
            steps={getTutorialSteps()}
            enabled={visibleTasks.length > 0}
          />
        )}
      </div>

      {deletingTask && (
        <Modal
          isOpen={!!deletingTask}
          onClose={() => {
            triggerHaptic(); // 5. モーダルを閉じる際に触覚をトリガー
            setDeletingTask(null);
          }}
          overlayClassName="z-50"
          contentClassName="bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm flex flex-col items-center gap-3 text-center"
        >
          <Trash2 className="w-10 h-10 text-red-400" />
          <h4 className="font-black text-slate-800">タスクを削除しますか？</h4>
          <p className="text-sm text-slate-500">
            「{deletingTask.title}」を削除します。
            <br />
            一度削除すると元に戻せません。
          </p>
          <div className="flex gap-2 w-full mt-1">
            <button
              onClick={handleDeleteConfirm}
              className="flex-1 py-2 text-sm font-bold bg-red-400 text-white rounded-lg hover:bg-red-500 transition-colors"
            >
              削除する
            </button>
            <button
              onClick={() => {
                triggerHaptic(); // 6. キャンセル時に触覚をトリガー
                setDeletingTask(null);
              }}
              className="flex-1 py-2 text-sm font-bold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
