import { Modal } from "./Modal";

const DEFAULT_DESCRIPTION =
  "新しいタスクの追加を通知したり、タイマーのいちごが貯まった数を表示したりするために通知をオンにしてね。";

interface NotificationPermissionModalProps {
  isOpen: boolean;
  onEnable: () => void;
  onDismiss: () => void;
  /** 説明文を上書きしたい場合に指定する（例: 支援者向けの案内文）。未指定時は学習者向けの標準文言。 */
  description?: string;
}

/**
 * OS標準の通知許可ダイアログを出す前に表示する、アプリ内の説明ダイアログ。
 * iOS はこの許可が下りていないとアプリアイコンにバッジ（いちごの個数など）が
 * 表示されないため、いきなりOSダイアログを出さずに理由を伝えてから
 * ユーザー自身の意思でオンにしてもらう。
 */
export const NotificationPermissionModal = ({
  isOpen,
  onEnable,
  onDismiss,
  description = DEFAULT_DESCRIPTION,
}: NotificationPermissionModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onDismiss}
      contentClassName="w-full max-w-xs rounded-3xl p-6"
    >
      <h2 className="text-base font-bold text-gray-700 mb-2">
        通知をオンにしませんか？
      </h2>
      <p className="text-sm text-gray-500 leading-relaxed mb-5">
        {description}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDismiss}
          className="flex-1 py-2.5 rounded-full bg-gray-100 text-gray-600 font-bold text-sm active:scale-95 transition-transform"
        >
          あとで
        </button>
        <button
          type="button"
          onClick={onEnable}
          className="flex-1 py-2.5 rounded-full bg-emerald-400 text-white font-bold text-sm active:scale-95 transition-transform"
        >
          オンにする
        </button>
      </div>
    </Modal>
  );
};
