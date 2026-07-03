import type { TabInfo } from "../types";

interface HomeProps {
  currentTabInfo: TabInfo;
  message: string;
  onMainActionClick: () => void;
}

export default function Home({
  currentTabInfo,
  message,
  onMainActionClick,
}: HomeProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 w-full max-w-md bg-white p-4 rounded-xl shadow-md mb-8 z-10">
        <p className="text-center text-sm text-gray-500 font-bold mb-1">
          {currentTabInfo.label}画面
        </p>
        <p className="text-center text-xs text-gray-400 mb-2 border-b pb-2">
          アクション結果
        </p>
        <p className="text-center font-bold text-blue-600 text-lg">{message}</p>
      </div>

      <div className="w-full max-w-md flex justify-center my-8">
        <button
          onClick={onMainActionClick}
          className="px-8 py-4 bg-sky-400 text-white font-bold rounded-full shadow-lg transform transition-transform duration-100 active:scale-95 active:bg-sky-500 w-full max-w-xs text-lg flex items-center justify-center gap-2"
        >
          メインアクション
        </button>
      </div>
    </div>
  );
}
