import { forwardRef } from "react";
import type { TabInfo } from "../../types";

interface TabContentProps {
  activeTab: number;
  currentTabInfo: TabInfo;
  slideDirection: string;
  message: string;
  onMainActionClick: () => void;
}

export const TabContent = forwardRef<HTMLElement, TabContentProps>(
  (
    { activeTab, currentTabInfo, slideDirection, message, onMainActionClick },
    ref,
  ) => {
    return (
      <main
        key={activeTab}
        ref={ref}
        className={`w-full h-full overflow-y-auto flex flex-col items-center p-4 bg-gray-50 ${
          slideDirection === "next"
            ? "slide-next"
            : slideDirection === "prev"
              ? "slide-prev"
              : ""
        }`}
      >
        <div className="sticky top-0 w-full max-w-md bg-white p-4 rounded-xl shadow-md mb-8 z-10">
          <p className="text-center text-sm text-gray-500 font-bold mb-1">
            {currentTabInfo.label}画面
          </p>
          <p className="text-center text-xs text-gray-400 mb-2 border-b pb-2">
            アクション結果
          </p>
          <p className="text-center font-bold text-blue-600 text-lg">
            {message}
          </p>
        </div>

        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`top-${activeTab}-${i}`}
            className="w-full max-w-md p-6 bg-white rounded-xl shadow-sm mb-4 border border-gray-100 flex gap-4"
          >
            <div className="w-12 h-12 rounded-full bg-gray-200 flex-none"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}

        <div className="w-full max-w-md flex justify-center my-8">
          <button
            onClick={onMainActionClick}
            className="px-8 py-4 bg-sky-400 text-white font-bold rounded-full shadow-lg transform transition-transform duration-100 active:scale-95 active:bg-sky-500 w-full max-w-xs text-lg flex items-center justify-center gap-2"
          >
            メインアクション
          </button>
        </div>

        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={`bottom-${activeTab}-${i}`}
            className="w-full max-w-md p-6 bg-white rounded-xl shadow-sm mb-4 border border-gray-100"
          >
            <div className="h-3 bg-gray-200 rounded w-full mb-3"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6 mb-3"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        ))}

        <div className="h-20 w-full flex-none flex items-center justify-center text-gray-400 text-sm">
          ここまで
        </div>
      </main>
    );
  },
);

TabContent.displayName = "TabContent";
