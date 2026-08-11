import { useCallback, useRef, useState } from "react";
import {
  isAppBadgeSupported,
  requestBadgeNotificationPermission,
} from "./useAppBadge";

const getNotificationPermission = (): NotificationPermission | null => {
  if (typeof Notification === "undefined") return null;
  try {
    return Notification.permission;
  } catch {
    return null;
  }
};

/**
 * OS標準の通知許可ダイアログ（Notification.requestPermission）を
 * いきなり出すのではなく、まずアプリ内の説明ダイアログを挟んでから
 * ユーザーの意思で許可をリクエストしてもらうためのフック。
 *
 * 使い方:
 *   const { isPromptOpen, guard, confirmEnable, dismissPrompt } =
 *     useNotificationPermissionPrompt();
 *
 *   const handleStart = () => guard(() => start());
 *
 *   // JSX側:
 *   <NotificationPermissionModal
 *     isOpen={isPromptOpen}
 *     onEnable={confirmEnable}
 *     onDismiss={dismissPrompt}
 *   />
 *
 * guard(action) は:
 * - 通知許可がすでに確定済み（許可 or 拒否）、または
 *   このブラウザ/環境がそもそもバッジ・通知に対応していない場合は
 *   説明ダイアログを出さずに即 action() を実行する。
 * - 通知許可が未回答（"default"）の場合のみ、説明ダイアログを開き、
 *   action は「有効にする」または「あとで」が選ばれるまで保留する。
 *
 * 許可が未回答である限り、タイマー開始のたびに説明ダイアログが
 * 再度表示される（＝許可 or 拒否が確定するまで毎回挟まる）仕様。
 */
export const useNotificationPermissionPrompt = () => {
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const runPendingAction = () => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    action?.();
  };

  const guard = useCallback((action: () => void) => {
    const permission = getNotificationPermission();
    const shouldExplainFirst =
      isAppBadgeSupported() && permission === "default";

    if (!shouldExplainFirst) {
      action();
      return;
    }

    pendingActionRef.current = action;
    setIsPromptOpen(true);
  }, []);

  // 説明ダイアログの「オンにする」→ ここで初めてOS標準の許可ダイアログを出す。
  const confirmEnable = useCallback(async () => {
    setIsPromptOpen(false);
    await requestBadgeNotificationPermission();
    runPendingAction();
  }, []);

  // 「あとで」→ 許可はリクエストせず、もともとの操作（タイマー開始など）だけ続行する。
  const dismissPrompt = useCallback(() => {
    setIsPromptOpen(false);
    runPendingAction();
  }, []);

  return { isPromptOpen, guard, confirmEnable, dismissPrompt };
};
