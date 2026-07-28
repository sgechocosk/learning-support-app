import { Sparkles } from "lucide-react";
import { useSupporterTutorialContext } from "./SupporterTutorialContext";

interface TutorialNoteProps {
  text: string;
  className?: string;
}

export const TutorialNote = ({ text, className }: TutorialNoteProps) => {
  const { active, dismiss } = useSupporterTutorialContext();

  if (!active) return null;

  return (
    <div
      className={`flex items-start gap-2 bg-sky-50 border border-sky-100 rounded-xl p-2.5 animate-in fade-in duration-150 ${
        className ?? ""
      }`}
    >
      <Sparkles size={14} className="mt-0.5 shrink-0 text-sky-400" />
      <p className="text-[11px] text-sky-700 leading-relaxed flex-1">{text}</p>
      <button
        type="button"
        onClick={dismiss}
        className="text-[11px] text-sky-400 underline underline-offset-2 shrink-0"
      >
        閉じる
      </button>
    </div>
  );
};
