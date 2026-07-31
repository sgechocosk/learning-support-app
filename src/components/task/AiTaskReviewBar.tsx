import { AlertCircle, Loader2, Sparkles, X } from "lucide-react";
import { AI_INPUT_BAR_FOOTER_TUCK_HEIGHT } from "./AiTaskInputBar";

interface AiTaskReviewBarProps {
  isOpen: boolean;
  includedCount: number;
  errorMsg: string | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onExecute: () => void;
}

// 提案の中身自体はタスク一覧の中にインラインで表示されるため、
// ここでは「件数の確認」と「実行／キャンセル」だけを行う薄いバーを
// 入力欄のすぐ上にドッキングして表示する。一覧を覆い隠す要素は持たない。
export const AiTaskReviewBar = ({
  isOpen,
  includedCount,
  errorMsg,
  isSubmitting,
  onCancel,
  onExecute,
}: AiTaskReviewBarProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-x-0 z-20 flex justify-center px-4 pointer-events-none"
      style={{
        bottom: `calc(${AI_INPUT_BAR_FOOTER_TUCK_HEIGHT} + 64px + 8px)`,
      }}
    >
      <div className="w-full pointer-events-auto bg-white rounded-2xl shadow-[0_-4px_16px_rgba(0,0,0,0.12)] border border-sky-100 px-3 py-2.5 flex flex-col gap-2">
        {errorMsg && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle size={14} className="shrink-0" />
            {errorMsg}
          </p>
        )}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-bold text-sky-600 shrink-0">
            <Sparkles size={14} className="text-sky-400" />
            AI提案を確認中
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="ml-auto p-1.5 rounded-full hover:bg-sky-50 text-sky-400 shrink-0"
            aria-label="レビューをやめる"
          >
            <X size={16} />
          </button>
          <button
            type="button"
            onClick={onExecute}
            disabled={isSubmitting || includedCount === 0}
            className="shrink-0 py-2 px-3 text-xs font-bold bg-sky-400 text-white rounded-xl shadow-sm hover:bg-sky-500 active:bg-sky-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                実行中...
              </>
            ) : (
              `選択した${includedCount}件を実行`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
