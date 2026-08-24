import { useState, useRef, useEffect } from "react";
import Auth from "./Auth";
import { useAuth } from "./hooks/useAuth";
import { useHaptic } from "./hooks/useHaptic";
import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";
import { Overlay } from "./components/layout/Overlay";
import { TabContent } from "./components/ui/TabContent";
import type { OverlayType } from "./types";
import "./index.css";

import Home from "./pages/Home";
import Calendar from "./pages/Calendar";
import Task from "./pages/Task";
import Timer from "./pages/Timer";
import Reward from "./pages/Reward";
import InvitePartner from "./pages/InvitePartner";
import AcceptInvite from "./pages/AcceptInvite";

// 作成した ProfileProvider をインポート
import { ProfileProvider } from "./contexts/ProfileContext";
import { CategoryProvider } from "./contexts/CategoryContext";
import { TaskProvider } from "./contexts/TaskContext";
import { RewardProvider } from "./contexts/RewardContext";
import { TimerSettingsProvider } from "./contexts/TimerSettingsContext";
import { PointEventsProvider } from "./contexts/PointEventsContext";
import { AiTaskAgentProvider } from "./contexts/AiTaskAgentContext";
import { TimerSessionProvider } from "./contexts/TimerSessionContext";
import { LearnerBadgeSync } from "./components/timer/LearnerBadgeSync";
import { useAiTaskAgentContext } from "./contexts/AiTaskAgentContext";
import { AiTaskInputBar } from "./components/task/AiTaskInputBar";
import { AiTaskReviewBar } from "./components/task/AiTaskReviewBar";
import { useProfile } from "./hooks/useProfile";
import { usePushSubscription } from "./hooks/usePushSubscription";
import { TABS } from "./constants/tabs";

// タスクタブ表示中の支援者にのみ、AIへの指示入力欄とレビュー用バーを表示する。
// TabContent(スライドアニメーションでtransformが付与される)の外側・
// アプリ全体のfixedルート直下に置くことで、
// 1) transformを持つ祖先の影響を受けず常に画面下端に固定される
// 2) タブ切り替えでTask.tsxがアンマウントされても、この状態はAiTaskAgentProvider側に残ったまま消えない
export function SupporterAiTaskDock({ activeTab }: { activeTab: number }) {
  const { profile } = useProfile();
  const {
    isReviewActive,
    isGenerating,
    submit,
    cancelReview,
    executeReview,
    errorMsg,
    isSubmitting,
    includedCount,
  } = useAiTaskAgentContext();

  const isSupporter = profile?.role === "supporter";
  // タスクタブ(index: 2)を表示している時だけ見せる
  if (!isSupporter || activeTab !== 2) return null;

  return (
    <>
      <AiTaskInputBar onSubmit={submit} isGenerating={isGenerating} />
      {!isGenerating && (
        <AiTaskReviewBar
          isOpen={isReviewActive}
          includedCount={includedCount}
          errorMsg={errorMsg}
          isSubmitting={isSubmitting}
          onCancel={cancelReview}
          onExecute={executeReview}
        />
      )}
    </>
  );
}

// ログイン後の画面。
// 支援者(role: "supporter")でまだペアが存在しない場合は、
// 学習者を招待する画面を表示する。
function AuthenticatedGate({ children }: { children: React.ReactNode }) {
  const { profile, pairId, isLoading } = useProfile();

  // 通知の許可が既に得られているセッション（前回付与済み等）では、
  // どのタブを開いていてもアプリ起動時に自動でpush購読を作成/更新する。
  // 未許可の間は何もしない（許可リクエスト自体はTimer開始時の導線のまま）。
  usePushSubscription(profile?.id, pairId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-300">
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (profile?.role === "supporter" && !pairId) {
    return <InvitePartner />;
  }

  return <>{children}</>;
}

// push通知の navigate 先(例: "/?tab=timer")で開かれた場合に、
// URLの ?tab=<TABSのid> を見て起動時のタブを決定する。
// 該当する id が無い/クエリが無い場合は、従来通り前回選択していたタブ
// (sessionStorageのactive_tab)を使う。
function resolveInitialTab(): number {
  const tabId = new URLSearchParams(window.location.search).get("tab");
  if (tabId) {
    const index = TABS.findIndex((t) => t.id === tabId);
    if (index !== -1) return index;
  }
  return Number(sessionStorage.getItem("active_tab") || 0);
}

export default function App() {
  const { isAuthenticated, setIsAuthenticated, lastSignInAt } = useAuth();
  const triggerHaptic = useHaptic();

  const [activeTab, setActiveTab] = useState(resolveInitialTab);

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

    setTimeout(() => setIsMoving(false), 150);
  };

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollPositions.current[activeTab] || 0;
    }
  }, [activeTab]);

  // 通知タップ経由で ?tab=<id> 付きで開かれた場合、
  // 初回反映(resolveInitialTabでのactiveTab決定)が終わったら
  // sessionStorageに同期しつつURLからは消しておく。
  // 消しておかないと、リロードやブラウザの「戻る」操作のたびに
  // 毎回同じタブへ強制的に戻され続けてしまう。
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("tab")) {
      sessionStorage.setItem("active_tab", String(activeTab));
      params.delete("tab");
      const url = new URL(window.location.href);
      url.search = params.toString();
      window.history.replaceState({}, "", url.toString());
    }
    // 初回マウント時のみ判定すればよい
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const inviteToken = new URLSearchParams(window.location.search).get("invite");

  if (inviteToken) {
    return (
      <AcceptInvite
        token={inviteToken}
        onCompleted={() => {
          // URLからinviteパラメータを取り除き、通常のアプリ画面へ
          const url = new URL(window.location.href);
          url.searchParams.delete("invite");
          window.history.replaceState({}, "", url.toString());
          setIsAuthenticated(true);
          setActiveTab(0);
          sessionStorage.setItem("active_tab", "0");
        }}
      />
    );
  }

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
          <PointEventsProvider>
            <RewardProvider>
              <TimerSettingsProvider>
                <TimerSessionProvider>
                  <AuthenticatedGate>
                    <AiTaskAgentProvider>
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
                            {activeTab === 0 && <Home />}
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
                            className="absolute inset-0 pointer-events-none z-30"
                          />
                        </div>

                        <LearnerBadgeSync />
                        {/* TabContent(transformが付与される)の外側に置くことで、
                      画面下端への固定位置が常に正しく保たれ、タブ切り替えでも状態が消えない */}
                        <SupporterAiTaskDock activeTab={activeTab} />

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
                    </AiTaskAgentProvider>
                  </AuthenticatedGate>
                </TimerSessionProvider>
              </TimerSettingsProvider>
            </RewardProvider>
          </PointEventsProvider>
        </TaskProvider>
      </CategoryProvider>
    </ProfileProvider>
  );
}
