import { useState } from "react";
import { TABS } from "../../constants/tabs";

interface FooterProps {
  activeTab: number;
  isMoving: boolean;
  onTabChange: (index: number) => void;
}

export const Footer = ({ activeTab, isMoving, onTabChange }: FooterProps) => {
  const [pressedTab, setPressedTab] = useState<number | null>(null);

  return (
    <footer className="flex-none relative pb-[calc(env(safe-area-inset-bottom)+20px)] drop-shadow-[0_-2px_8px_rgba(0,0,0,0.08)] z-20">
      <div className="absolute inset-0 bg-sky-300"></div>
      <div className="h-16 relative w-full max-w-md mx-auto flex">
        <div
          className="absolute transition-all duration-[400ms] spring-bounce flex justify-center pointer-events-none z-0"
          style={{
            top: "-12px",
            left: `calc(${activeTab * 19 + 12}% - 50px)`,
            width: "100px",
            height: "12px",
          }}
        >
          <svg
            width="100"
            height="13"
            viewBox="0 0 100 12"
            className={`absolute bottom-[-1px] text-sky-300 fill-current size-transition ${isMoving ? "translate-y-[8px]" : "translate-y-0"}`}
          >
            <path d="M0 12 C 25 12, 35 0, 50 0 C 65 0, 75 12, 100 12 Z" />
          </svg>
          <div
            className={`absolute top-[4px] w-12 h-12 bg-white rounded-full size-transition ${isMoving ? "scale-50 translate-y-[4px]" : "scale-100 translate-y-0"}`}
          ></div>
        </div>
        <div className="relative z-10 flex w-full h-full">
          {TABS.map((tab, index) => {
            const isActive = activeTab === index;
            const isPressed = pressedTab === index;
            const Icon = tab.icon;
            return (
              <div
                key={tab.id}
                onPointerDown={() => {
                  if (!isActive) setPressedTab(index);
                }}
                onPointerUp={() => {
                  if (pressedTab === index) onTabChange(index);
                  setPressedTab(null);
                }}
                onPointerLeave={() => setPressedTab(null)}
                onPointerCancel={() => setPressedTab(null)}
                style={{ flexBasis: isActive ? "24%" : "19%" }}
                className={`flex-shrink-0 flex flex-col items-center justify-center relative h-full transition-all duration-[400ms] spring-bounce ${isActive ? "pointer-events-none" : "cursor-pointer"}`}
              >
                <div
                  className={`w-full h-full flex items-center justify-center transition-transform duration-200 spring-squish ${
                    isPressed && !isActive
                      ? "scale-75 translate-y-[2px]"
                      : "scale-100 translate-y-0"
                  }`}
                >
                  <div
                    className={`transition-all duration-[400ms] spring-bounce absolute flex items-center justify-center w-12 h-12 ${
                      isActive
                        ? "top-[-8px] text-sky-400 scale-[1.2]"
                        : "top-[4px] text-white/90 scale-[0.85]"
                    }`}
                  >
                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span
                    className={`absolute bottom-1.5 text-[10px] font-bold transition-all duration-[400ms] spring-bounce ${
                      isActive
                        ? "text-white opacity-100 scale-100 translate-y-0"
                        : "text-white/80 opacity-80 scale-90 translate-y-1"
                    }`}
                  >
                    {tab.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </footer>
  );
};
