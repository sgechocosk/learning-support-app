import { useEffect, useRef, useState } from "react";
import { usePointEvents } from "../hooks/usePointEvents";
import { useProfile } from "../hooks/useProfile";
import SupporterLearningStats from "../components/home/SupporterLearningStats";

const MAX_STRAWBERRIES = 90;

// ================= 直近7日間の活動バー用ヘルパー =================
const JST_WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

/** 「日本時刻4時始まりの日」のキー（YYYY-MM-DD）を、今日を含めて直近n日分、古い順に返す */
function getLastNJstDayKeys(n: number): string[] {
  const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const RESET_HOUR_MS = 4 * 60 * 60 * 1000;
  const shiftedNow = new Date(Date.now() + JST_OFFSET_MS - RESET_HOUR_MS);

  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(
        shiftedNow.getUTCFullYear(),
        shiftedNow.getUTCMonth(),
        shiftedNow.getUTCDate() - i,
      ),
    );
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    keys.push(`${y}-${m}-${day}`);
  }
  return keys;
}

/** "YYYY-MM-DD" キーから曜日ラベル（日〜土）を返す */
function getWeekdayLabel(jstDateKey: string): string {
  const [y, m, d] = jstDateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return JST_WEEKDAY_LABELS[date.getUTCDay()];
}

// ================= 木の描画パラメータ（見本のstrawberrytreeを移植） =================
const TREE_LAYOUTS = [
  { x: 0, y: 130, s: 1.0 },
  { x: -180, y: 70, s: 0.85 },
  { x: 180, y: 70, s: 0.85 },
  { x: -320, y: 110, s: 0.95 },
  { x: 320, y: 110, s: 0.95 },
  { x: -100, y: 30, s: 0.75 },
  { x: 100, y: 30, s: 0.75 },
  { x: -260, y: 40, s: 0.78 },
  { x: 260, y: 40, s: 0.78 },
  { x: 0, y: -10, s: 0.65 },
];

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function initTrees(width: number) {
  const centerX = width / 2;
  const groundY = 440;

  return TREE_LAYOUTS.map((layout, i) => ({
    id: i,
    x: centerX + layout.x,
    y: groundY + layout.y,
    baseScale: layout.s,
    seed: 12345 + i * 999,
  })).sort((a, b) => a.y - b.y);
}

function drawBerry(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = "#145c14";
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.lineTo(-8, -6);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-8, 4);
  ctx.lineTo(-1, 2);
  ctx.lineTo(0, 6);
  ctx.lineTo(1, 2);
  ctx.lineTo(8, 4);
  ctx.lineTo(3, 0);
  ctx.lineTo(8, -6);
  ctx.fill();

  ctx.fillStyle = "#ff1a1a";
  ctx.beginPath();
  ctx.arc(0, 6, 8, Math.PI, 0);
  ctx.bezierCurveTo(8, 16, 2, 22, 0, 22);
  ctx.bezierCurveTo(-2, 22, -8, 16, -8, 6);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(-4 + i * 4, 8 + (i % 2) * 4, 1.5, 2);
    ctx.fillRect(-2 + i * 2, 14 - (i % 2) * 2, 1.5, 2);
  }
  ctx.restore();
}

function drawLeaves(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  rng: () => number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const numLeaves = 8 + Math.floor(rng() * 8);
  for (let i = 0; i < numLeaves; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = rng() * 25;

    ctx.fillStyle = `hsl(${100 + rng() * 50}, ${40 + rng() * 40}%, ${25 + rng() * 30}%)`;
    ctx.beginPath();
    ctx.ellipse(
      Math.cos(angle) * dist,
      Math.sin(angle) * dist * 1.5,
      10 + rng() * 10,
      15 + rng() * 12,
      rng() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
}

function calcBranch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  len: number,
  angle: number,
  depth: number,
  berryPositions: { x: number; y: number }[],
  rng: () => number,
  isMain = true,
) {
  angle = angle * 0.6 + (-Math.PI / 2) * 0.4 + (rng() - 0.5) * 0.15;

  const nx = x + Math.cos(angle) * len;
  const ny = y + Math.sin(angle) * len;

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(
    (x + nx) / 2 + (rng() - 0.5) * len * 0.1,
    (y + ny) / 2,
    nx,
    ny,
  );
  ctx.lineWidth = depth * 2.2 + 1.5;
  ctx.strokeStyle = `hsl(${25 + rng() * 10}, ${40 + rng() * 20}%, ${12 + depth * 2.5}%)`;
  ctx.lineCap = "round";
  ctx.stroke();

  if (depth < 4 && rng() > 0.2) {
    drawLeaves(ctx, nx, ny, 0.4 + depth * 0.12, rng);
    const bCount = Math.floor(rng() * 2) + 1;
    for (let k = 0; k < bCount; k++) {
      berryPositions.push({
        x: nx + (rng() - 0.5) * 30,
        y: ny + (rng() - 0.5) * 30,
      });
    }
  }

  if (depth > 0) {
    const numBranches = isMain ? (rng() > 0.3 ? 2 : 3) : rng() > 0.6 ? 1 : 2;
    for (let i = 0; i < numBranches; i++) {
      const nextIsMain = isMain && i === 0;
      let a = angle;
      let newLen = len;

      if (nextIsMain) {
        a += (rng() - 0.5) * 0.2;
        newLen *= 0.8 + rng() * 0.1;
      } else {
        a +=
          (i % 2 === 0 ? 1 : -1) *
          (isMain ? 1 : rng() > 0.5 ? 1 : -1) *
          (0.4 + rng() * 0.5);
        newLen *= 0.5 + rng() * 0.25;
      }
      calcBranch(
        ctx,
        nx,
        ny,
        newLen,
        a,
        depth - 1,
        berryPositions,
        rng,
        nextIsMain,
      );
    }
  } else {
    drawLeaves(ctx, nx, ny, 1.2, rng);
    for (let k = 0; k < 4; k++) {
      berryPositions.push({
        x: nx + (rng() - 0.5) * 50,
        y: ny + (rng() - 0.5) * 50,
      });
    }
  }
}

function selectBerries(
  positions: { x: number; y: number }[],
  count: number,
  rng: () => number,
) {
  if (count <= 0) return [];

  positions.sort((a, b) => a.y - b.y);
  const layers: { x: number; y: number }[][] = [[], [], [], []];
  positions.forEach((p, i) =>
    layers[Math.floor((i / positions.length) * 4)].push(p),
  );

  const shuffled: { x: number; y: number }[] = [];
  while (layers.some((l) => l.length > 0)) {
    layers.forEach((layer) => {
      if (layer.length > 0) {
        shuffled.push(layer.splice(Math.floor(rng() * layer.length), 1)[0]);
      }
    });
  }

  const selected: { x: number; y: number }[] = [];
  const tryAddBerries = (minDistSq: number) => {
    for (const pos of shuffled) {
      if (selected.length >= count) break;
      if (!selected.includes(pos)) {
        const isTooClose = selected.some(
          (s) =>
            Math.pow(pos.x - s.x, 2) * 1.5 + Math.pow(pos.y - s.y, 2) <
            minDistSq,
        );
        if (!isTooClose) selected.push(pos);
      }
    }
  };

  tryAddBerries(5000);
  if (selected.length < count) tryAddBerries(1500);
  if (selected.length < count) tryAddBerries(0);

  return selected;
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  t: { x: number; y: number; baseScale: number; seed: number },
  scale: number,
  berryCount: number,
  allBerries: { x: number; y: number; scale: number }[],
) {
  const rng = mulberry32(t.seed);
  ctx.save();
  ctx.translate(t.x, t.y);

  const finalScale = scale * t.baseScale * 0.95;
  ctx.scale(finalScale, finalScale);

  const berryPositions: { x: number; y: number }[] = [];
  calcBranch(
    ctx,
    0,
    0,
    130 + rng() * 20,
    -Math.PI / 2 + (rng() - 0.5) * 0.1,
    5,
    berryPositions,
    rng,
    true,
  );

  selectBerries(berryPositions, berryCount, rng).forEach((pos) => {
    allBerries.push({
      x: t.x + pos.x * finalScale,
      y: t.y + pos.y * finalScale,
      scale: Math.max(0.6, 1.0 / Math.pow(finalScale, 0.4)) * finalScale,
    });
  });

  ctx.restore();
}

interface StrawberryTreeProps {
  /** 今日（日本時刻4時更新）に獲得したイチゴの個数。0〜90。 */
  count: number;
}

function StrawberryTree({ count }: StrawberryTreeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [treeData, setTreeData] = useState<
    { id: number; x: number; y: number; baseScale: number; seed: number }[]
  >([]);

  useEffect(() => {
    setTreeData(initTrees(800));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || treeData.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 0, 600);
    ["#87CEEB", "#E0F6FF", "#6B8E23", "#556B2F"].forEach((color, i) => {
      grad.addColorStop([0, 0.7, 0.7, 1][i], color);
    });
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 600);

    const allBerries: { x: number; y: number; scale: number }[] = [];
    treeData.forEach((t) => {
      const c = Math.max(0, Math.min(10, count - t.id * 10));
      if (c > 0 || t.id === 0) {
        drawTree(ctx, t, 0.3 + 0.7 * (c / 10), c, allBerries);
      }
    });

    allBerries
      .sort((a, b) => a.y - b.y)
      .forEach((b) => drawBerry(ctx, b.x, b.y, b.scale));
  }, [count, treeData]);

  return (
    <div className="w-full flex flex-col items-center mb-4">
      <div className="w-full aspect-[4/3] landscape:w-auto landscape:aspect-[4/3] landscape:h-[38vh] landscape:max-h-72 landscape:mx-auto bg-white rounded-xl shadow-md overflow-hidden relative">
        <canvas
          ref={canvasRef}
          width="800"
          height="600"
          className="w-full h-full block"
        />
      </div>
      <p
        className="text-center text-sky-600 font-bold mt-3"
        style={{
          fontFamily: '"M PLUS Rounded 1c", "Nunito", "Quicksand", sans-serif',
        }}
      >
        今日獲得したイチゴ：{count}コ
      </p>
    </div>
  );
}

interface WeeklyStreakBarProps {
  events: { jst_date: string; amount: number }[];
  streakDays: number;
}

/** デュオリンゴ風の、直近7日間の獲得状況を横一列で見せるバー */
function WeeklyStreakBar({ events, streakDays }: WeeklyStreakBarProps) {
  const dayKeys = getLastNJstDayKeys(7);
  const todayKey = dayKeys[dayKeys.length - 1];

  const totalsByDay = new Map<string, number>();
  events.forEach((e) => {
    totalsByDay.set(e.jst_date, (totalsByDay.get(e.jst_date) ?? 0) + e.amount);
  });

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl leading-none">🔥</span>
        <span className="font-bold text-gray-700 text-sm">
          {streakDays > 0
            ? `${streakDays}日連続でいちごをゲット中！`
            : "今日からいちごを貯めよう！"}
        </span>
      </div>

      <div className="flex w-full items-start justify-between gap-1">
        {dayKeys.map((key) => {
          const achieved = (totalsByDay.get(key) ?? 0) > 0;
          const isToday = key === todayKey;

          return (
            <div key={key} className="flex flex-1 flex-col items-center gap-1">
              <span
                className={
                  "text-[11px] font-bold " +
                  (isToday ? "text-sky-500" : "text-gray-400")
                }
              >
                {getWeekdayLabel(key)}
              </span>
              <div
                className={
                  "aspect-square w-full max-w-9 rounded-full transition-colors " +
                  (achieved
                    ? "bg-red-400 shadow-sm"
                    : "bg-gray-100 border-2 border-dashed border-gray-200") +
                  (isToday ? " ring-2 ring-sky-400 ring-offset-2" : "")
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  // タスク完了・タイマー完了の両方が point_events に記録されているため、
  // ここから「今日（日本時刻4時更新）獲得したいちご」「連続獲得日数」
  // 「直近7日間の獲得有無」を取得する。
  // 日付の切り分け（4時境界）は DB 側トリガー（jst_date）で確定させており、
  // フロント側では二重計算しない。
  const { events, todayTotal, streakDays } = usePointEvents();
  const { profile, pairId } = useProfile();

  const clampedCount = Math.max(0, Math.min(MAX_STRAWBERRIES, todayTotal));

  // 学習時間帯のグラフ・通知候補は支援者のホーム画面にのみ表示する
  // （学習者自身には見せない）。
  const isSupporter = profile?.role === "supporter";

  return (
    <div className="flex flex-col items-center w-full">
      <StrawberryTree count={clampedCount} />

      <WeeklyStreakBar events={events} streakDays={streakDays} />

      {isSupporter && <SupporterLearningStats pairId={pairId} />}
    </div>
  );
}
