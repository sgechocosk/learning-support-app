import { useRef, useState } from "react";
import { User, Bell } from "lucide-react";
import type { OverlayType } from "../../types";
import { Modal } from "../ui/Modal";
import { useProfile } from "../../hooks/useProfile";
import { useHaptic } from "../../hooks/useHaptic";

interface HeaderProps {
  onOpenOverlay: (e: React.MouseEvent, type: OverlayType) => void;
}

const DEFAULT_PAIR_NAME = "学習支援アプリ";
const LONG_PRESS_DURATION_MS = 500;

export const Header = ({ onOpenOverlay }: HeaderProps) => {
  const { pairId, pairName, updatePairName } = useProfile();
  const triggerHaptic = useHaptic();

  const displayName = pairName ?? DEFAULT_PAIR_NAME;

  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const openEditModal = () => {
    setSaveError(null);
    setDraftName(pairName ?? "");
    setIsEditing(true);
  };

  const handlePressStart = () => {
    if (!pairId) return;
    longPressTriggeredRef.current = false;
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      triggerHaptic();
      openEditModal();
    }, LONG_PRESS_DURATION_MS);
  };

  const handlePressEnd = () => {
    clearLongPressTimer();
  };

  const handleSave = async () => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      setSaveError("ペア名を入力してください");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    const ok = await updatePairName(trimmed);
    setIsSaving(false);

    if (ok) {
      setIsEditing(false);
    } else {
      setSaveError("保存に失敗しました。もう一度お試しください");
    }
  };

  const handleCancel = () => {
    if (isSaving) return;
    setIsEditing(false);
  };

  return (
    <header className="flex-none h-12 bg-sky-300 text-white shadow-sm z-20 flex items-start justify-center font-bold text-lg relative">
      <button
        onClick={(e) => onOpenOverlay(e, "profile")}
        className="absolute left-4 top-0 p-2 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors"
      >
        <User size={24} />
      </button>
      <span
        className="pt-2 select-none cursor-pointer px-4 max-w-[60%] truncate"
        onPointerDown={handlePressStart}
        onPointerUp={handlePressEnd}
        onPointerLeave={handlePressEnd}
        onPointerCancel={handlePressEnd}
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => {
          if (longPressTriggeredRef.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {displayName}
      </span>
      <button
        onClick={(e) => onOpenOverlay(e, "notification")}
        className="absolute right-4 top-0 p-2 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors"
      >
        <Bell size={24} />
      </button>

      <Modal
        isOpen={isEditing}
        onClose={handleCancel}
        contentClassName="rounded-2xl w-80 max-w-full p-5"
      >
        <h2 className="text-gray-800 font-bold text-base mb-3">ペア名を編集</h2>
        <input
          type="text"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder={DEFAULT_PAIR_NAME}
          maxLength={30}
          autoFocus
          disabled={isSaving}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 text-base focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:bg-gray-100"
        />
        {saveError && <p className="text-red-500 text-xs mt-2">{saveError}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors text-sm font-bold disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-sky-400 text-white hover:bg-sky-500 active:bg-sky-600 transition-colors text-sm font-bold disabled:opacity-50"
          >
            {isSaving ? "保存中..." : "保存"}
          </button>
        </div>
      </Modal>
    </header>
  );
};
