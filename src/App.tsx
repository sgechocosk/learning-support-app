import { useState, useRef, useEffect } from "react";
import Auth from "./Auth";
import { useAuth } from "./hooks/useAuth";
import { useHaptic } from "./hooks/useHaptic";
import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";
import { Overlay } from "./components/layout/Overlay";
import { TabContent } from "./components/ui/TabContent";
import { TABS } from "./constants/tabs";
import type { OverlayType } from "./types";
import "./index.css";

import Home from "./pages/Home";
import Calendar from "./pages/Calendar";
import Task from "./pages/Task";
import Timer from "./pages/Timer";
import Reward from "./pages/Reward";

// 作成した ProfileProvider をインポート
import { ProfileProvider } from "./contexts/ProfileContext";
import { CategoryProvider } from "./contexts/CategoryContext";
import { TaskProvider } from "./contexts/TaskContext";
import { RewardProvider } from "./contexts/RewardContext";
import { TimerSettingsProvider } from "./contexts/TimerSettingsContext";

export default function App() {
  const { isAuthenticated, setIsAuthenticated, lastSignInAt } = useAuth();
  const triggerHaptic = useHaptic();

  const initialTab = Number(sessionStorage.getItem("active_tab") || 0);
  const [activeTab, setActiveTab] = useState(initialTab);

  const [message, setMessage] = useState("ボタンをタップしてください");
  const [slideDirection, setSlideDirection] = useState("none");
  const [isMoving, setIsMoving] = useState(false);

  const [overlayType, setOverlayType] = useState<OverlayType>("none");
  const [isOverlayClosing, setIsOverlayClosing] = useState(false);
  const [clickPos, setClickPos] = useState({ x: 0, y: 0 });

  const scrollPositions = useRef<Record<number, number>>({
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  });
  const scrollContainerRef = useRef<HTMLElement>(null);

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

  const openOverlay = (e: React.MouseEvent, type: OverlayType) => {
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

  const handleMainActionClick = () => {
    triggerHaptic();
    setMessage(`${TABS[activeTab].label}のメインボタンがタップされました`);
  };

  if (!isAuthenticated) {
    return (
      <Auth
        onLoginSuccess={() => {
          setIsAuthenticated(true);
          setActiveTab(0);
          sessionStorage.setItem("active_tab", "0");
          setOverlayType("none");
          setIsOverlayClosing(false);
        }}
      />
    );
  }

  return (
    // ログイン後のメインアプリケーション全体を ProfileProvider でラップする
    <ProfileProvider>
      <CategoryProvider>
        <TaskProvider>
          <RewardProvider>
            <TimerSettingsProvider>
              <div className="fixed inset-0 flex flex-col bg-gray-50 select-none">
                <style>{`
          :root {
            --click-x: ${clickPos.x}px;
            --click-y: ${clickPos.y}px;
          }
          @keyframes ripple-in { 0% { clip-path: circle(0px at var(--click-x) var(--click-y)); } 100% { clip-path: circle(150% at var(--click-x) var(--click-y)); } }
          @keyframes ripple-out { 0% { clip-path: circle(150% at var(--click-x) var(--click-y)); } 100% { clip-path: circle(0px at var(--click-x) var(--click-y)); } }
          @keyframes slide-down-in { 0% { transform: translateY(-100%); } 100% { transform: translateY(0); } }
          @keyframes slide-up-out { 0% { transform: translateY(0); } 100% { transform: translateY(-100%); } }
          .animate-ripple-in { animation: ripple-in 0.5s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
          .animate-ripple-out { animation: ripple-out 0.4s cubic-bezier(0.5, 0, 0.2, 1) forwards; }
          .animate-slide-down-in { animation: slide-down-in 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
          .animate-slide-up-out { animation: slide-up-out 0.4s cubic-bezier(0.5, 0, 0.2, 1) forwards; }
        `}</style>

                <Header onOpenOverlay={openOverlay} />

                <div className="flex-1 overflow-hidden relative bg-gray-50">
                  <TabContent
                    ref={scrollContainerRef}
                    activeTab={activeTab}
                    slideDirection={slideDirection}
                  >
                    {activeTab === 0 && (
                      <Home
                        currentTabInfo={TABS[activeTab]}
                        message={message}
                        onMainActionClick={handleMainActionClick}
                      />
                    )}
                    {activeTab === 1 && <Calendar />}
                    {activeTab === 2 && <Task />}
                    {activeTab === 3 && <Timer />}
                    {activeTab === 4 && <Reward />}
                  </TabContent>

                  {/* モーダルの描画先。ヘッダー/フッターを含まないこの領域だけに
                    オーバーレイを表示するためのポータルルート。
                    中身が無い時はクリックを透過させ、下のコンテンツを操作可能にする。 */}
                  <div
                    id="modal-portal-root"
                    className="absolute inset-0 pointer-events-none z-10"
                  />
                </div>

                <Footer
                  activeTab={activeTab}
                  isMoving={isMoving}
                  onTabChange={handleTabChange}
                />

                <Overlay
                  type={overlayType}
                  isClosing={isOverlayClosing}
                  lastSignInAt={lastSignInAt}
                  onClose={closeOverlay}
                />
              </div>
            </TimerSettingsProvider>
          </RewardProvider>
        </TaskProvider>
      </CategoryProvider>
    </ProfileProvider>
  );
}
