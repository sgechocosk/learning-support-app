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
  const { pairId } = useProfile();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = async () => {
    if (!pairId) {
      setTasks([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*, categories(id, name, color)")
      .eq("pair_id", pairId)
      .order("scheduled_at", { ascending: true, nullsFirst: false });

    if (data && !error) setTasks(data as unknown as Task[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTasks();
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
    if (!error) await fetchTasks();
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
    if (!error) await fetchTasks();
    return { error: error?.message ?? null };
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (!error) await fetchTasks();
    return { error: error?.message ?? null };
  };

  const completeTask = async (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    const rpcName = target?.is_completed ? "uncomplete_task" : "complete_task";
    const { error } = await supabase.rpc(rpcName, { task_id: taskId });
    if (!error) await fetchTasks();
    return { error: error?.message ?? null };
  };

  const claimTaskPoints = async (taskId: string) => {
    const { error } = await supabase.rpc("claim_task_points", {
      task_id: taskId,
    });
    if (!error) await fetchTasks();
    return { error: error?.message ?? null };
  };

  return (
    <TaskContext.Provider
      value={{
        tasks,
        isLoading,
        refreshTasks: fetchTasks,
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
