import React, { useState, useEffect, useRef } from "react";
import { Home, Search, PlusCircle, Bell, User } from "lucide-react";
import { supabase } from "./supabaseClient";

export default function App({ session }) {
  const [message, setMessage] = useState("ボタンをタップしてください");
  const [activeTab, setActiveTab] = useState(0);
  const [slideDirection, setSlideDirection] = useState("none");
  const [pressedTab, setPressedTab] = useState<number | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  const scrollPositions = useRef({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 });
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const hiddenInput = document.createElement("input");
    hiddenInput.type = "checkbox";
    hiddenInput.setAttribute("switch", "");
    hiddenInput.id = "haptic-trigger-hack";
    hiddenInput.style.position = "absolute";
    hiddenInput.style.opacity = "0";
    hiddenInput.style.pointerEvents = "none";
    document.body.appendChild(hiddenInput);

    const hiddenLabel = document.createElement("label");
    hiddenLabel.htmlFor = "haptic-trigger-hack";
    hiddenLabel.id = "haptic-label-hack";
    hiddenLabel.style.display = "none";
    document.body.appendChild(hiddenLabel);

    return () => {
      document.body.removeChild(hiddenInput);
      document.body.removeChild(hiddenLabel);
    };
  }, []);

  const triggerHaptic = () => {
    const label = document.getElementById("haptic-label-hack");
    if (label) label.click();
  };

  const tabs = [
    { id: "home", icon: Home, label: "ホーム" },
    { id: "search", icon: Search, label: "検索" },
    { id: "add", icon: PlusCircle, label: "追加" },
    { id: "bell", icon: Bell, label: "通知" },
    { id: "user", icon: User, label: "プロフ" },
  ];

  const handleButtonClick = (buttonName) => {
    triggerHaptic();
    setMessage(`${buttonName}がタップされました`);
  };

  const handleLogout = async () => {
    triggerHaptic();
    await supabase.auth.signOut();
  };

  const handleTabChange = (newTabIndex) => {
    if (activeTab === newTabIndex) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    if (scrollContainerRef.current) {
      scrollPositions.current[activeTab] = scrollContainerRef.current.scrollTop;
    }

    setSlideDirection(newTabIndex > activeTab ? "next" : "prev");
    setIsMoving(true);
    setActiveTab(newTabIndex);
    handleButtonClick(`フッター: ${tabs[newTabIndex].label}`);

    setTimeout(() => {
      setIsMoving(false);
    }, 150);
  };

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollPositions.current[activeTab] || 0;
    }
  }, [activeTab]);

  const currentTab = tabs[activeTab];

  const renderTabContent = () => {
    if (currentTab.id === "user") {
      return (
        <div className="w-full max-w-md flex flex-col items-center mt-8 gap-6">
          <div className="p-4 bg-white rounded-xl shadow-md w-full text-center">
            <p className="text-gray-500 font-bold mb-2">ログイン情報</p>
            <p className="text-gray-800 break-all">{session?.user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-8 py-4 bg-red-500 text-white font-bold rounded-full shadow-lg transform transition-transform duration-100 active:scale-95 active:bg-red-600 w-full max-w-xs text-lg"
          >
            ログアウト
          </button>
        </div>
      );
    }

    return (
      <>
        <div className="sticky top-0 w-full max-w-md bg-white p-4 rounded-xl shadow-md mb-8 z-10">
          <p className="text-center text-sm text-gray-500 font-bold mb-1">
            {currentTab.label}画面
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
            onClick={() =>
              handleButtonClick(`${currentTab.label}のメインボタン`)
            }
            className="px-8 py-4 bg-sky-400 text-white font-bold rounded-full shadow-lg transform transition-transform duration-100 active:scale-95 active:bg-sky-500 w-full max-w-xs text-lg flex items-center justify-center gap-2"
          >
            メインアクション
          </button>
        </div>

        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`bottom-${activeTab}-${i}`}
            className="w-full max-w-md p-6 bg-white rounded-xl shadow-sm mb-4 border border-gray-100"
          >
            <div className="h-3 bg-gray-200 rounded w-full mb-3"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6 mb-3"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        ))}
      </>
    );
  };

  return (
    <>
      <style>{`
        * {
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
        }
        body {
          overscroll-behavior-y: none;
          overflow: hidden;
          margin: 0;
        }
        .spring-bounce {
          transition-timing-function: cubic-bezier(0.25, 1.2, 0.4, 1);
        }
        .spring-squish {
          transition-timing-function: cubic-bezier(0.4, 0.0, 0.2, 1);
        }
        .size-transition {
          transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        @keyframes slideInNext {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        
        @keyframes slideInPrev {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }

        .slide-next {
          animation: slideInNext 250ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        
        .slide-prev {
          animation: slideInPrev 250ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}</style>

      <div className="fixed inset-0 flex flex-col bg-gray-50 select-none">
        <header className="flex-none h-16 bg-sky-300 text-white shadow-sm z-20 flex items-center justify-center font-bold text-lg relative">
          UI Test
        </header>

        <div className="flex-1 overflow-hidden relative bg-gray-50">
          <main
            key={activeTab}
            ref={scrollContainerRef}
            className={`w-full h-full overflow-y-auto flex flex-col items-center p-4 bg-gray-50 ${
              slideDirection === "next"
                ? "slide-next"
                : slideDirection === "prev"
                  ? "slide-prev"
                  : ""
            }`}
          >
            {renderTabContent()}

            <div className="h-20 w-full flex-none flex items-center justify-center text-gray-400 text-sm">
              ここまで
            </div>
          </main>
        </div>

        <footer className="flex-none relative pb-[env(safe-area-inset-bottom)] drop-shadow-[0_-2px_8px_rgba(0,0,0,0.08)] z-20">
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
              {tabs.map((tab, index) => {
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
                      if (pressedTab === index) {
                        handleTabChange(index);
                      }
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
      </div>
    </>
  );
}
