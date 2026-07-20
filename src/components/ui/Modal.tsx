import { useEffect, type ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: ReactNode;
  contentClassName?: string;
  overlayClassName?: string;
}

export const Modal = ({
  isOpen,
  onClose,
  children,
  contentClassName = "",
  overlayClassName = "z-50",
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

  return (
    <div
      className={`fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 ${overlayClassName}`}
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
};
