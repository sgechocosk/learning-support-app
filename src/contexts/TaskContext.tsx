import { createContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Task } from "../types";
import { useProfile } from "../hooks/useProfile";

interface TaskContextType {
  tasks: Task[];
  isLoading: boolean;
  refreshTasks: () => Promise<void>;
  createTask: (input: {
    title: string;
    categoryId: string | null;
    rewardPoints: number;
    scheduledAt?: string | null;
  }) => Promise<{ error: string | null }>;
  updateTask: (
    taskId: string,
    updates: {
      title?: string;
      categoryId?: string | null;
      rewardPoints?: number;
      scheduledAt?: string | null;
    },
  ) => Promise<{ error: string | null }>;
  deleteTask: (taskId: string) => Promise<{ error: string | null }>;
  completeTask: (taskId: string) => Promise<{ error: string | null }>;
  claimTaskPoints: (taskId: string) => Promise<{ error: string | null }>;
}

export const TaskContext = createContext<TaskContextType | undefined>(
  undefined,
);

export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const { pairId, refreshProfile } = useProfile();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const sortTasks = (list: Task[]) => {
    return [...list].sort((a, b) => {
      const aClaimed = a.points_awarded_at !== null;
      const bClaimed = b.points_awarded_at !== null;

      if (aClaimed !== bClaimed) return aClaimed ? 1 : -1;

      const aDate = a.scheduled_at
        ? new Date(a.scheduled_at).getTime()
        : Infinity;
      const bDate = b.scheduled_at
        ? new Date(b.scheduled_at).getTime()
        : Infinity;
      return aDate - bDate;
    });
  };

  const fetchTasks = async (isBackground = false) => {
    if (!pairId) {
      setTasks([]);
      setIsLoading(false);
      return;
    }
    if (!isBackground) setIsLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*, categories(id, name, color)")
      .eq("pair_id", pairId)
      .order("scheduled_at", { ascending: true, nullsFirst: false });

    if (data && !error) setTasks(sortTasks(data as unknown as Task[]));
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTasks();

    if (!pairId) return;

    const channel = supabase
      .channel(`tasks-pair-${pairId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `pair_id=eq.${pairId}`,
        },
        () => {
          fetchTasks(true);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pairId]);

  const createTask: TaskContextType["createTask"] = async ({
    title,
    categoryId,
    rewardPoints,
    scheduledAt = null,
  }) => {
    if (!pairId) return { error: "pair not found" };
    const { error } = await supabase.from("tasks").insert({
      pair_id: pairId,
      category_id: categoryId,
      title,
      reward_points: rewardPoints,
      scheduled_at: scheduledAt,
    });
    if (!error) await fetchTasks(true);
    return { error: error?.message ?? null };
  };

  const updateTask: TaskContextType["updateTask"] = async (taskId, updates) => {
    const payload: Record<string, unknown> = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.categoryId !== undefined)
      payload.category_id = updates.categoryId;
    if (updates.rewardPoints !== undefined)
      payload.reward_points = updates.rewardPoints;
    if (updates.scheduledAt !== undefined)
      payload.scheduled_at = updates.scheduledAt;

    const { error } = await supabase
      .from("tasks")
      .update(payload)
      .eq("id", taskId);
    if (!error) await fetchTasks(true);
    return { error: error?.message ?? null };
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (!error) await fetchTasks(true);
    return { error: error?.message ?? null };
  };

  const completeTask = async (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    const rpcName = target?.is_completed ? "uncomplete_task" : "complete_task";
    const { error } = await supabase.rpc(rpcName, { task_id: taskId });
    if (!error) {
      // tasks.is_completed / total_completed_tasks（と即時付与設定の場合は
      // total_points）はDB側トリガーで更新されるが、profiles側の変更は
      // Realtimeの購読が届くまで画面に反映されない。redeemReward等と同様に
      // ここで明示的にプロフィールを再取得し、Realtime到達前でも
      // 確実に最新の値が表示されるようにする。
      await Promise.all([fetchTasks(true), refreshProfile()]);
    }
    return { error: error?.message ?? null };
  };

  const claimTaskPoints = async (taskId: string) => {
    const { error } = await supabase.rpc("claim_task_points", {
      task_id: taskId,
    });
    if (!error) {
      // total_points はこのRPCで加算される。Realtime到達を待たず
      // ここで即座にプロフィールを再取得して確実に反映させる。
      await Promise.all([fetchTasks(true), refreshProfile()]);
    }
    return { error: error?.message ?? null };
  };

  return (
    <TaskContext.Provider
      value={{
        tasks,
        isLoading,
        refreshTasks: () => fetchTasks(true),
        createTask,
        updateTask,
        deleteTask,
        completeTask,
        claimTaskPoints,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};
