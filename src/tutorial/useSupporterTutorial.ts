import { useCallback, useState } from "react";

const STORAGE_KEY = "tutorial_task_done_supporter";

// 支援者向けチュートリアルの既読状態を管理するフック。
// スポットライト形式のステップ進行とは異なり、
// 各フォーム項目にフォーカスしたときだけ吹き出しで説明を出す方式なので、
// ここでは「まだ読了していないか」の1状態だけを持てば良い。
export const useSupporterTutorial = () => {
  const [active, setActive] = useState(
    () => localStorage.getItem(STORAGE_KEY) !== "true",
  );

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setActive(false);
  }, []);

  const restart = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setActive(true);
  }, []);

  return { active, dismiss, restart };
};
