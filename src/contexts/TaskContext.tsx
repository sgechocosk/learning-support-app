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
    isDaily?: boolean;
    notify?: boolean;
  }) => Promise<{ error: string | null }>;
  updateTask: (
    taskId: string,
    updates: {
      title?: string;
      categoryId?: string | null;
      rewardPoints?: number;
      scheduledAt?: string | null;
      isDaily?: boolean;
      notify?: boolean;
    },
  ) => Promise<{ error: string | null }>;
  createTasksBulk: (
    inputs: {
      title: string;
      categoryId: string | null;
      rewardPoints: number;
      scheduledAt?: string | null;
      isDaily?: boolean;
    }[],
  ) => Promise<{ error: string | null; insertedCount: number }>;
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

      // 毎日タスクは完了/未完了に関わらず常に上位グループに配置する。
      // is_completed を条件に含めると、学習者が完了操作をした瞬間に
      // ピン留めが外れて他のタスクより下に移動してしまい、それに伴って
      // 予定日のないタスクなど周囲のタスクの表示順まで連動してズレて
      // しまうため、is_daily のみで判定する（完了操作では位置を変えない）。
      const aPinned = a.is_daily;
      const bPinned = b.is_daily;

      if (aPinned !== bPinned) return aPinned ? -1 : 1;

      const aDate = a.scheduled_at
        ? new Date(a.scheduled_at).getTime()
        : Infinity;
      const bDate = b.scheduled_at
        ? new Date(b.scheduled_at).getTime()
        : Infinity;

      if (aDate !== bDate) return aDate - bDate;

      // 予定日が同じ（または共に未設定）の場合は作成日時で安定した順序を保つ。
      // これがないと、DBの取得順が予定日だけでは一意に定まらず、
      // 完了操作のたびに再取得された順序が変わって表示位置が
      // 意図せず入れ替わってしまう。
      const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;

      return aCreated - bCreated;
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
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

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

  // 学習者への通知（タスクの追加・更新）を送る。
  // 通知の作成自体が失敗しても、タスク操作そのものは既に成功しているため
  // ここでのエラーは握りつぶし、画面には影響させない。
  //
  // Web Push（OS通知）は、notificationsへのINSERT成功後にこの関数から
  // 直接 Edge Function (send-push) を呼び出して送信する。
  // 以前はDatabase Webhook/DBトリガー経由で送っていたが、
  // トリガー用SQL(pg_net)がプロジェクトの設定次第で失敗し、
  // notificationsへのINSERT自体を巻き込んでロールバックさせてしまう
  // （＝お知らせが一切保存されない）事故が起きたため、
  // 「INSERTを先に確定させ、成功したら別途Edge Functionを呼ぶ」
  // というクライアント主導の設計に変更している。
  const sendTaskNotification = async (
    kind: "task_created" | "task_updated",
    title: string,
    taskId: string | null,
  ) => {
    if (!pairId) return;
    const message =
      kind === "task_created"
        ? `新しいタスク「${title}」が追加されました`
        : `タスク「${title}」が更新されました`;

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        pair_id: pairId,
        task_id: taskId,
        type: kind,
        title,
        message,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("notification insert failed:", error);
      return;
    }

    // push送信はベストエフォート。失敗してもお知らせ画面への表示には影響しない。
    supabase.functions
      .invoke("send-push", { body: { notificationId: data.id } })
      .catch((err) => {
        console.error("send-push invoke failed:", err);
      });
  };

  const createTask: TaskContextType["createTask"] = async ({
    title,
    categoryId,
    rewardPoints,
    scheduledAt = null,
    isDaily = false,
    notify = true,
  }) => {
    if (!pairId) return { error: "pair not found" };
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        pair_id: pairId,
        category_id: categoryId,
        title,
        reward_points: rewardPoints,
        scheduled_at: scheduledAt,
        is_daily: isDaily,
      })
      .select("id")
      .single();

    if (!error) {
      await fetchTasks(true);
      if (notify)
        await sendTaskNotification("task_created", title, data?.id ?? null);
    }
    return { error: error?.message ?? null };
  };

  const createTasksBulk: TaskContextType["createTasksBulk"] = async (
    inputs,
  ) => {
    if (!pairId) return { error: "pair not found", insertedCount: 0 };
    if (inputs.length === 0) return { error: null, insertedCount: 0 };

    const rows = inputs.map((input) => ({
      pair_id: pairId,
      category_id: input.categoryId,
      title: input.title,
      reward_points: input.rewardPoints,
      scheduled_at: input.scheduledAt ?? null,
      is_daily: input.isDaily ?? false,
    }));

    const { error } = await supabase.from("tasks").insert(rows);
    if (!error) await fetchTasks(true);
    return {
      error: error?.message ?? null,
      insertedCount: error ? 0 : rows.length,
    };
  };

  const updateTask: TaskContextType["updateTask"] = async (taskId, updates) => {
    const payload: {
      title?: string;
      category_id?: string | null;
      reward_points?: number;
      scheduled_at?: string | null;
      is_daily?: boolean;
    } = {};

    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.categoryId !== undefined)
      payload.category_id = updates.categoryId;
    if (updates.rewardPoints !== undefined)
      payload.reward_points = updates.rewardPoints;
    if (updates.scheduledAt !== undefined)
      payload.scheduled_at = updates.scheduledAt;
    if (updates.isDaily !== undefined) payload.is_daily = updates.isDaily;

    const { error } = await supabase
      .from("tasks")
      .update(payload)
      .eq("id", taskId);

    if (!error) {
      await fetchTasks(true);
      const notify = updates.notify ?? true;
      const title =
        updates.title ?? tasks.find((t) => t.id === taskId)?.title ?? "";
      if (notify && title) {
        await sendTaskNotification("task_updated", title, taskId);
      }
    }
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
        createTasksBulk,
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
