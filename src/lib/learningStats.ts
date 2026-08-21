// 学習者の point_events（source: "timer"）から「1日のうちどの時間帯に
// 学習しているか」を15分刻みでヒストグラム化し、そこから支援者への
// 通知に適した時刻を3つ提案するためのロジック。
//
// 【2026-08〜】このファイルの binTimerEvents / calculateNotificationBins は
// もう画面表示のたびにフロントで直接呼ばれてはいない。
// 「グラフの対象データ・通知候補は深夜のバッチ処理でしか変化しない」という
// 要件に合わせ、実際の計算は毎晩1回(推奨: JST 4:00)実行される
// Edge Function `supabase/functions/compute-learning-notification-times`
// に移動し、結果を learning_notification_stats テーブルへスナップショットとして
// 保存するようになった。フロントは useLearningNotificationStats フックで
// そのスナップショットを読むだけ（SupporterLearningStats.tsx 参照）。
//
// このファイルの2関数は、Edge Function側の実装と完全に同一ロジックを保つための
// 「リファレンス実装」として残している（単体テストや将来のロジック変更時に
// フロント・バックエンドで差分が出ないよう、まずここを直してからEdge Function側
// に同じ変更を反映する運用を想定）。BIN_COUNT / BIN_MINUTES / binIndexToLabel は
// 引き続き表示用ラベルの生成に使われている。
//
// アルゴリズムは元々 learning_notification_time.html（検証用プロトタイプ）の
// ものを移植している:
//   1. 各レコードを15分ビン(1日96ビン)に積み上げる
//   2. 「次のビンへの増加量」が大きい＝学習が立ち上がるタイミングを
//      通知の候補とする
//   3. 候補同士は4時間以上離す（通知が固まらないように）
//   4. 増加量だけでは3件に満たない場合、学習量そのものが多いビューを
//      間隔条件つきで補充する

import type { PointEvent } from "../types";

/** 1日を15分単位で区切ったビンの数（24h * 60 / 15） */
export const BIN_COUNT = 96;
/** 1ビンあたりの分数 */
export const BIN_MINUTES = 15;

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
// 1件のpoint_eventsが複数個分（amount > 1）まとめて記録されている場合、
// created_at 1点に積み上げてしまうと山が不自然に尖るため、
// 学習ツール側の検証ロジックに合わせて1個分あたり3分ずつ遡りながら
// 分散させる。
const SPREAD_STEP_MS = 3 * 60 * 1000;

/**
 * source が "timer" の point_events を、時刻(時分・JST)ベースで
 * 15分ビン(96個)に積み上げる。日付・曜日は問わず「1日のうちのどの時間帯か」
 * だけを見る点に注意（Home画面の「今日の合計」などとは別軸の集計）。
 */
export function binTimerEvents(events: PointEvent[]): number[] {
  const bins = new Array(BIN_COUNT).fill(0);

  events.forEach((event) => {
    if (event.source !== "timer") return;

    const amount = Number(event.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const baseMs = new Date(event.created_at).getTime();
    if (Number.isNaN(baseMs)) return;

    // amountが2以上のときは「まとめて2個分付与された」とみなし、
    // 3分ずつ遡った複数時刻として積み上げる（1点への集中を避ける）。
    const count = Math.max(1, Math.round(amount));

    for (let i = 0; i < count; i++) {
      const jstMs = baseMs + JST_OFFSET_MS - i * SPREAD_STEP_MS;
      const jstDate = new Date(jstMs);
      const minutesOfDay = jstDate.getUTCHours() * 60 + jstDate.getUTCMinutes();
      // 遡った結果マイナスになっても、そのぶん前日の時間帯として
      // 折り返して扱う（%演算で0〜1439に正規化）。
      const normalizedMinutes =
        ((minutesOfDay % (24 * 60)) + 24 * 60) % (24 * 60);
      const binIndex = Math.floor(normalizedMinutes / BIN_MINUTES);
      bins[binIndex] += 1;
    }
  });

  return bins;
}

/**
 * ビンごとの学習量から、通知に適した時刻（ビンindex）を最大3件返す。
 * 「学習が立ち上がる入り口」を優先し、足りなければ学習量そのものが
 * 多い時間帯で補う。候補同士は最低4時間（16ビン）離す。
 */
export function calculateNotificationBins(data: number[]): number[] {
  const MIN_INTERVAL_BINS = (4 * 60) / BIN_MINUTES; // 4時間 = 16ビン

  const isFarEnough = (index: number, chosen: number[]) =>
    chosen.every((t) => {
      const diff = Math.abs(index - t);
      const distance = Math.min(diff, BIN_COUNT - diff); // 日をまたぐ円環距離
      return distance >= MIN_INTERVAL_BINS;
    });

  // 1. 「次の15分への増加量」が大きい順に候補化
  const gradients = data.map((val, index) => {
    const nextIndex = (index + 1) % BIN_COUNT;
    const increase = data[nextIndex] - val;
    return { index, val, increase };
  });

  const sortedByGradient = [...gradients].sort((a, b) => {
    if (b.increase !== a.increase) return b.increase - a.increase;
    return b.val - a.val;
  });

  const times: number[] = [];
  for (const item of sortedByGradient) {
    if (times.length === 3) break;
    // 最初の1件は増加量が0以下でも許容するが、2件目以降は
    // 「実際に増えている」入り口だけを候補にする
    if (item.increase <= 0 && times.length > 0) continue;
    if (isFarEnough(item.index, times)) times.push(item.index);
  }

  // 2. 増加量だけでは3件に満たない場合、学習量そのものの多い時間帯で補充
  if (times.length < 3) {
    const sortedByVolume = data
      .map((val, index) => ({ val, index }))
      .sort((a, b) => b.val - a.val);

    for (const item of sortedByVolume) {
      if (times.length === 3) break;
      if (times.includes(item.index)) continue;
      if (isFarEnough(item.index, times)) times.push(item.index);
    }
  }

  return times.sort((a, b) => a - b);
}

/** ビンindex(0〜95)を "H:MM" 形式(JST)のラベルに変換する */
export function binIndexToLabel(index: number): string {
  const h = Math.floor((index * BIN_MINUTES) / 60);
  const m = (index * BIN_MINUTES) % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}
