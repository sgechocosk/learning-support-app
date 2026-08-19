import { useCallback, useEffect } from "react";
import {
  ensurePushSubscription,
  getPushUnsupportedReason,
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
 *
 * subscribeNow() は診断しやすいよう、成功なら null、失敗なら理由の文字列を返す。
 * （呼び出し元がその場でユーザーに見せられるようにするため）
 */
export const usePushSubscription = (
  userId: string | null | undefined,
  pairId: string | null | undefined,
) => {
  useEffect(() => {
    // isPushSupported() が false でも「なぜ false なのか」を必ずログに残す。
    // VAPID公開鍵の設定漏れ等は、これがないと画面上・コンソール上どちらにも
    // 一切の手がかりが残らず「何も起きない」状態になってしまうため。
    const reason = getPushUnsupportedReason();
    if (reason) {
      console.warn("[push] このデバイスではpush購読を行いません:", reason);
      return;
    }
    registerServiceWorker();
  }, []);

  useEffect(() => {
    if (!isPushSupported()) return;
    if (!userId || !pairId) return;
    if (getNotificationPermission() !== "granted") return;

    ensurePushSubscription(userId, pairId).then(({ error }) => {
      if (error) {
        console.warn("[push] 自動購読に失敗:", error);
      } else {
        console.info("[push] 自動購読に成功しました");
      }
    });
  }, [userId, pairId]);

  const subscribeNow = useCallback(async (): Promise<string | null> => {
    const reason = getPushUnsupportedReason();
    if (reason) {
      console.warn("[push] subscribeNow: 非対応環境のため中止:", reason);
      return reason;
    }
    if (!userId || !pairId) {
      return "ユーザー情報またはペア情報が取得できていません";
    }
    const { error } = await ensurePushSubscription(userId, pairId);
    if (error) {
      console.warn("[push] subscribeNow失敗:", error);
      return error;
    }
    console.info("[push] subscribeNow成功");
    return null;
  }, [userId, pairId]);

  return { subscribeNow };
};
