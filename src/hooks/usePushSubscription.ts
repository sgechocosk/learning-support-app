import { useCallback, useEffect } from "react";
import {
  ensurePushSubscription,
  isPushSupported,
  registerServiceWorker,
} from "../lib/push";

const getNotificationPermission = (): NotificationPermission | null => {
  if (typeof Notification === "undefined") return null;
  try {
    return Notification.permission;
  } catch {
    return null;
  }
};

/**
 * Web Push の購読状態を管理するフック。
 *
 * - マウント時にService Workerだけは常に登録しておく（購読の可否に関わらず）。
 * - 通知許可が既に "granted"（前回のセッション等で許可済み）であれば、
 *   pairId/userId が確定次第、自動でpush購読を作成・保存する。
 *   → 既存の許可ダイアログ導線（Timer開始時のuseNotificationPermissionPrompt）
 *     とは独立して動くため、ヘッダーや既存フローには手を入れていない。
 * - 許可が "default"（未回答）の間は何もしない。既存の許可リクエスト導線で
 *   ユーザーが許可した後、次回このフックが評価されたタイミング
 *   （pairId変化時 or 次回起動時）で自動的に購読される。
 *   即時に購読させたい場合は、許可リクエスト成功時に返り値の
 *   subscribeNow() を呼び出す。
 */
export const usePushSubscription = (
  userId: string | null | undefined,
  pairId: string | null | undefined,
) => {
  useEffect(() => {
    if (!isPushSupported()) return;
    registerServiceWorker();
  }, []);

  useEffect(() => {
    if (!isPushSupported()) return;
    if (!userId || !pairId) return;
    if (getNotificationPermission() !== "granted") return;

    ensurePushSubscription(userId, pairId).then(({ error }) => {
      if (error) {
        console.warn("push subscription skipped:", error);
      }
    });
  }, [userId, pairId]);

  const subscribeNow = useCallback(() => {
    if (!userId || !pairId) return Promise.resolve();
    return ensurePushSubscription(userId, pairId).then(({ error }) => {
      if (error) console.warn("push subscription failed:", error);
    });
  }, [userId, pairId]);

  return { subscribeNow };
};
