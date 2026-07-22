import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: ReactNode;
  contentClassName?: string;
  overlayClassName?: string;
}

// モーダルはヘッダー/フッターを除いたコンテンツ領域内にのみ描画する。
// App.tsx がコンテンツ領域(ヘッダーとフッターの間)に用意した
// #modal-portal-root にポータルで描画することで、
// ヘッダー・フッターは常にオーバーレイの外＝操作可能なままになる。
const MODAL_PORTAL_ROOT_ID = "modal-portal-root";

export const Modal = ({
  isOpen,
  onClose,
  children,
  contentClassName = "",
  overlayClassName = "z-10",
}: ModalProps) => {
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modal = (
    <div
      className={`absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 touch-none overscroll-none pointer-events-auto ${overlayClassName}`}
      onClick={() => onClose?.()}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white shadow-xl ${contentClassName}`.trim()}
      >
        {children}
      </div>
    </div>
  );

  const portalRoot = document.getElementById(MODAL_PORTAL_ROOT_ID);
  return portalRoot ? createPortal(modal, portalRoot) : modal;
};
