import { useProfile } from "../../hooks/useProfile";
import { useTimerSession } from "../../contexts/TimerSessionContext";
import { useAppBadge } from "../../hooks/useAppBadge";

/**
 * どのタブを開いていても、学習者としてログインしている間は
 * 稼働中/停止中を問わず常にPWAアイコンのバッジにいちご数を表示し続ける。
 * 画面には何も描画しない(サイドエフェクト専用)。
 *
 * 重要: useAppBadge の呼び出し元はアプリ全体でここ1箇所のみにすること。
 * useAppBadge はアンマウント時に必ずバッジを消す仕様のため、他の場所
 * (例: Timer.tsx)でも呼んでいると、そちらが先にアンマウントされた瞬間に
 * このバッジまで誤って消えてしまう。
 */
export function LearnerBadgeSync() {
  const { profile } = useProfile();
  const { strawberryCount } = useTimerSession();

  // 学習者以外(支援者)ではバッジを出さない
  const isLearner = profile?.role === "learner";
  useAppBadge(isLearner ? strawberryCount : null);

  return null;
}
