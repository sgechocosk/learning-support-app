import { createContext, useContext } from "react";

interface SupporterTutorialContextValue {
  // 支援者向けチュートリアルが有効かどうか（未読了の間だけ true）
  active: boolean;
  // 「もう表示しない」等で明示的に読了済みにする
  dismiss: () => void;
}

// Provider が無い（学習者側など）場合は常に非表示にしておく
export const SupporterTutorialContext =
  createContext<SupporterTutorialContextValue>({
    active: false,
    dismiss: () => {},
  });

export const useSupporterTutorialContext = () =>
  useContext(SupporterTutorialContext);
