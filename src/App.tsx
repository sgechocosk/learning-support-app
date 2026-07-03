import { useState, useEffect, useRef } from "react";
import {
  User,
  Bell,
  Home,
  Calendar,
  CheckSquare,
  Timer,
  Gift,
  X,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import Auth from "./Auth";
import "./index.css";

const TABS = [
  { id: "home", icon: Home, label: "ホーム" },
  { id: "calendar", icon: Calendar, label: "カレンダー" },
  { id: "checksquare", icon: CheckSquare, label: "タスク" },
  { id: "timer", icon: Timer, label: "タイマー" },
  { id: "gift", icon: Gift, label: "ごほうび" },
];

export default function App() {
  const initialAuth = localStorage.getItem("is_logged_in") === "true";
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth);

  const initialTab = Number(sessionStorage.getItem("active_tab") || 0);
  const [activeTab, setActiveTab] = useState(initialTab);

  const [message, setMessage] = useState("ボタンをタップしてください");
  const [slideDirection, setSlideDirection] = useState("none");
  const [pressedTab, setPressedTab] = useState<number | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  const [overlayType, setOverlayType] = useState<
    "none" | "profile" | "notification"
  >("none");
  const [isOverlayClosing, setIsOverlayClosing] = useState(false);
  const [clickPos, setClickPos] = useState({ x: 0, y: 0 });
  const [lastSignInAt, setLastSignInAt] = useState<string | null>(null);

  const scrollPositions = useRef<Record<number, number>>({
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  });
  const scrollContainerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const initUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setIsAuthenticated(true);
        localStorage.setItem("is_logged_in", "true");
        if (user.last_sign_in_at) {
          setLastSignInAt(
            new Date(user.last_sign_in_at).toLocaleString("ja-JP"),
          );
        }
      } else {
        setIsAuthenticated(false);
        localStorage.removeItem("is_logged_in");
      }
    };

    initUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true);
        localStorage.setItem("is_logged_in", "true");
        if (session.user.last_sign_in_at) {
          setLastSignInAt(
            new Date(session.user.last_sign_in_at).toLocaleString("ja-JP"),
          );
        }
      } else {
        setIsAuthenticated(false);
        localStorage.removeItem("is_logged_in");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

  const handleTabChange = (newTabIndex: number) => {
    triggerHaptic();

    if (activeTab === newTabIndex) {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (scrollContainerRef.current) {
      scrollPositions.current[activeTab] = scrollContainerRef.current.scrollTop;
    }

    setSlideDirection(newTabIndex > activeTab ? "next" : "prev");
    setIsMoving(true);

    setActiveTab(newTabIndex);
    sessionStorage.setItem("active_tab", String(newTabIndex));

    setMessage(`フッター: ${TABS[newTabIndex].label}がタップされました`);

    setTimeout(() => setIsMoving(false), 150);
  };

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollPositions.current[activeTab] || 0;
    }
  }, [activeTab]);

  const openOverlay = (
    e: React.MouseEvent,
    type: "profile" | "notification",
  ) => {
    triggerHaptic();
    setClickPos({ x: e.clientX, y: e.clientY });
    setOverlayType(type);
    setIsOverlayClosing(false);
  };

  const closeOverlay = () => {
    triggerHaptic();
    setIsOverlayClosing(true);
    setTimeout(() => {
      setOverlayType("none");
      setIsOverlayClosing(false);
    }, 450);
  };

  if (!isAuthenticated) {
    return <Auth onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  const currentTab = TABS[activeTab];

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 select-none">
      <style>{`
        :root {
          --click-x: ${clickPos.x}px;
          --click-y: ${clickPos.y}px;
        }
        @keyframes ripple-in {
          0% {
            clip-path: circle(0px at var(--click-x) var(--click-y));
          }
          100% {
            clip-path: circle(150% at var(--click-x) var(--click-y));
          }
        }
        @keyframes ripple-out {
          0% {
            clip-path: circle(150% at var(--click-x) var(--click-y));
          }
          100% {
            clip-path: circle(0px at var(--click-x) var(--click-y));
          }
        }
        @keyframes slide-down-in {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(0);
          }
        }
        @keyframes slide-up-out {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-100%);
          }
        }
        .animate-ripple-in {
          animation: ripple-in 0.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .animate-ripple-out {
          animation: ripple-out 0.4s cubic-bezier(0.5, 0, 0.2, 1) forwards;
        }
        .animate-slide-down-in {
          animation: slide-down-in 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .animate-slide-up-out {
          animation: slide-up-out 0.4s cubic-bezier(0.5, 0, 0.2, 1) forwards;
        }
      `}</style>

      <header className="flex-none h-16 bg-sky-300 text-white shadow-sm z-20 flex items-center justify-center font-bold text-lg relative">
        <button
          onClick={(e) => openOverlay(e, "profile")}
          className="absolute left-4 p-2 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors"
        >
          <User size={24} />
        </button>
        UI Test
        <button
          onClick={(e) => openOverlay(e, "notification")}
          className="absolute right-4 p-2 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors"
        >
          <Bell size={24} />
        </button>
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
              onClick={() => {
                triggerHaptic();
                setMessage(
                  `${currentTab.label}のメインボタンがタップされました`,
                );
              }}
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
                    if (pressedTab === index) handleTabChange(index);
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

      {overlayType !== "none" && (
        <div
          className={`fixed inset-0 z-50 flex flex-col bg-sky-50 ${
            isOverlayClosing
              ? overlayType === "profile"
                ? "animate-ripple-out"
                : "animate-slide-up-out"
              : overlayType === "profile"
                ? "animate-ripple-in"
                : "animate-slide-down-in"
          }`}
        >
          <header className="flex-none h-16 bg-sky-300 text-white shadow-sm flex items-center px-4 relative">
            {overlayType === "profile" ? (
              <button
                onClick={closeOverlay}
                className="absolute left-4 p-2 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors z-10"
              >
                <X size={24} />
              </button>
            ) : (
              <button
                onClick={closeOverlay}
                className="absolute right-4 p-2 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors z-10"
              >
                <Bell size={24} />
              </button>
            )}

            <h1 className="absolute inset-0 flex items-center justify-center font-bold text-lg">
              {overlayType === "profile" ? "プロフィール" : "お知らせ"}
            </h1>
          </header>

          <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
            <div className="w-24 h-24 bg-white text-sky-400 rounded-full flex items-center justify-center mb-6 shadow-sm">
              {overlayType === "profile" ? (
                <User size={48} />
              ) : (
                <Bell size={48} />
              )}
            </div>
            <h2 className="text-xl font-bold text-sky-800 mb-2">
              {overlayType === "profile" ? "プロフィール画面" : "お知らせ画面"}
            </h2>
            <p className="text-sky-700 text-center text-sm px-4">
              {overlayType === "profile"
                ? lastSignInAt
                  ? `最終ログイン: ${lastSignInAt}`
                  : ""
                : "最新の通知やメッセージを確認する画面のテンプレートです。"}
            </p>
          </main>
        </div>
      )}
    </div>
  );
}
