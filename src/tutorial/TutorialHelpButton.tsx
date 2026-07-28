import { HelpCircle } from "lucide-react";
import { useHaptic } from "../hooks/useHaptic";

interface TutorialHelpButtonProps {
  onClick: () => void;
}

export const TutorialHelpButton = ({ onClick }: TutorialHelpButtonProps) => {
  const triggerHaptic = useHaptic();

  return (
    <button
      type="button"
      onClick={() => {
        triggerHaptic();
        onClick();
      }}
      className="flex items-center justify-center w-7 h-7 rounded-full bg-sky-100 text-sky-500 hover:bg-sky-200 transition-colors shrink-0"
      aria-label="使い方チュートリアルを見る"
      title="使い方チュートリアル"
    >
      <HelpCircle size={16} />
    </button>
  );
};
