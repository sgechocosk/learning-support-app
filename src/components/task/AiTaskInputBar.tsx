import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { useHaptic } from "../../hooks/useHaptic";

interface AiTaskInputBarProps {
  onSubmit: (text: string) => void;
  // AIが処理中かどうか。trueの間は入力欄をロックし「考え中」表示に切り替える。
  isGenerating?: boolean;
}

const MAX_TEXTAREA_HEIGHT = 160;

// Footer.tsx: 内側 h-16(64px) + 外側 pb-[env(safe-area-inset-bottom)+20px]
const FOOTER_HEIGHT = "calc(64px + 20px + env(safe-area-inset-bottom))";
// アクティブタブのアイコンがフッター上端から盛り上がって表示される分の余白
const ACTIVE_ICON_CLEARANCE = 26;
// カードのうちフッターの背面に隠れる（＝付箋のように飛び出して見える）部分の高さ
const FOOTER_TUCK_HEIGHT = `calc(${FOOTER_HEIGHT} + ${ACTIVE_ICON_CLEARANCE}px - 8px)`;

export const AiTaskInputBar = ({
  onSubmit,
  isGenerating = false,
}: AiTaskInputBarProps) => {
  const triggerHaptic = useHaptic();
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // テキスト量に応じてテキストエリアの高さを一定量まで動的に変える（下端を固定したまま上に伸びる）
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [text]);

  const handleSend = () => {
    if (isGenerating) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    triggerHaptic();
    onSubmit(trimmed);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    // ボトムナビ(z-30)より背面、タスク一覧より手前(z-20)。
    // 画面の一番下(bottom:0)に固定し、下側の一定量はボトムナビの背面に隠れることで
    // 付箋のようにナビの下から飛び出しているように見える。
    // 既存タスクの一覧はこの入力欄の背後（上のスクロール領域）に常に表示されたままになる。
    <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pointer-events-none">
      <div className="w-full max-w-md pointer-events-auto rounded-t-2xl overflow-hidden border border-sky-200 border-b-0 bg-white shadow-[0_-6px_16px_rgba(0,0,0,0.10)]">
        {/* 実際に見える・操作できる入力エリア。ナビ本体やアイコンの盛り上がりとは重ならない */}
        <div className="flex items-end gap-2 px-3 py-2">
          {isGenerating ? (
            <Loader2
              size={18}
              className="text-sky-400 shrink-0 mb-2 ml-1 animate-spin"
            />
          ) : (
            <Sparkles size={18} className="text-sky-400 shrink-0 mb-2 ml-1" />
          )}
          {isGenerating ? (
            <div className="flex-1 py-1.5 leading-relaxed">
              <span className="text-sm text-sky-500 font-semibold inline-flex items-center gap-1">
                考え中
                <span className="inline-flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-sky-400 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1 h-1 rounded-full bg-sky-400 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1 h-1 rounded-full bg-sky-400 animate-bounce" />
                </span>
              </span>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="AIにタスク操作をお願いする"
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm focus:outline-none py-1.5 leading-relaxed overflow-y-auto"
              style={{ maxHeight: MAX_TEXTAREA_HEIGHT }}
            />
          )}
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || isGenerating}
            aria-label="AIに送信する"
            className="shrink-0 w-9 h-9 mb-0.5 flex items-center justify-center rounded-full bg-sky-400 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sky-500 active:bg-sky-600 transition-colors"
          >
            {isGenerating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
        {/* ここから下はボトムナビの背面に隠れる部分（付箋の"のりしろ"） */}
        <div style={{ height: FOOTER_TUCK_HEIGHT }} aria-hidden="true" />
      </div>
    </div>
  );
};

// 入力バーの実高さ（フッターへの食い込み分を除く、見えている操作エリアの高さ目安）。
// レビュー用の薄いアクションバー（AiTaskReviewBar）をこの上に重ねて表示するために参照する。
export const AI_INPUT_BAR_VISIBLE_HEIGHT = 64;
export const AI_INPUT_BAR_FOOTER_TUCK_HEIGHT = FOOTER_TUCK_HEIGHT;
