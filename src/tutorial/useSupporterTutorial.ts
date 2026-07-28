import { useCallback, useState } from "react";

// 支援者向けチュートリアルの既読状態を管理するフック。
// スポットライト形式のステップ進行とは異なり、
// 各フォーム項目にフォーカスしたときだけ吹き出しで説明を出す方式なので、
// ここでは「まだ読了していないか」の1状態だけを持てば良い。
//
// storageKey は画面ごとに別々の既読状態を持たせるために指定する
// （例：タスク画面は "tutorial_task_done_supporter"、
//      タイマー画面は "tutorial_timer_done_supporter"）。
export const useSupporterTutorial = (
  storageKey: string = "tutorial_task_done_supporter",
) => {
  const [active, setActive] = useState(
    () => localStorage.getItem(storageKey) !== "true",
  );

  const dismiss = useCallback(() => {
    localStorage.setItem(storageKey, "true");
    setActive(false);
  }, [storageKey]);

  return { active, dismiss };
};
