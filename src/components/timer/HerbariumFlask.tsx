import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Matter: any;
  }
}

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16) || 255;
  const g = parseInt(hex.slice(3, 5), 16) || 255;
  const b = parseInt(hex.slice(5, 7), 16) || 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const MATTER_CDN_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js";

let matterLoadPromise: Promise<void> | null = null;
const loadMatter = () => {
  if (window.Matter) return Promise.resolve();
  if (matterLoadPromise) return matterLoadPromise;
  matterLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${MATTER_CDN_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = MATTER_CDN_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.body.appendChild(script);
  });
  return matterLoadPromise;
};

// --- 追加: 🍓を毎フレームfillTextするのは非常に重いので、
// 半径ごとにオフスクリーンcanvasへ事前描画してキャッシュし、
// 本描画では drawImage のみで済ませる ---
const strawberrySpriteCache = new Map<number, HTMLCanvasElement>();
const getStrawberrySprite = (radius: number) => {
  // 半径を0.5刻みに丸めてキャッシュキー数を抑える(値のブレはランダム幅±0.8程度なので数種類で十分)
  const key = Math.round(radius * 2) / 2;
  const cached = strawberrySpriteCache.get(key);
  if (cached) return cached;

  const fontSize = key * 2.4;
  const size = Math.ceil(fontSize * 1.6); // 余白込みのスプライトサイズ
  const canvas = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 2); // キャッシュ生成コストも抑える
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${fontSize}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  ctx.fillText("🍓", size / 2, size / 2);

  strawberrySpriteCache.set(key, canvas);
  return canvas;
};

interface HerbariumFlaskProps {
  count: number;
  intervalMinutes: number;
  glassColorHex?: string;
  width?: number;
  height?: number;
}

export default function HerbariumFlask({
  count,
  intervalMinutes,
  glassColorHex = "#fb7185",
  width = 340, // 左右の余白を削るため400→340に変更
  height = 450, // 高さも無駄な余白を削るため500→450に変更
}: HerbariumFlaskProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const engineRef = useRef<any>(null);
  const bodiesApiRef = useRef<any>(null);
  const dropFnRef = useRef<((n: number) => void) | null>(null);
  const spawnedCountRef = useRef(0);
  const pendingCountRef = useRef(0);

  const countRef = useRef(count);
  const intervalMinutesRef = useRef(intervalMinutes);

  useEffect(() => {
    countRef.current = count;
    intervalMinutesRef.current = intervalMinutes;
  }, [count, intervalMinutes]);

  useEffect(() => {
    let cancelled = false;
    loadMatter().then(() => {
      if (!cancelled) setIsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !sceneRef.current) return;

    const {
      Engine,
      Render,
      Runner,
      Bodies,
      Composite,
      Mouse,
      MouseConstraint,
      Events,
      Body,
    } = window.Matter;

    const engine = Engine.create({ enableSleeping: true });
    // 反復回数を抑えて軽量化(すり抜け対策は速度クランプ側で担保)
    engine.positionIterations = 8;
    engine.velocityIterations = 6;
    engine.gravity.y = 0.8;
    engineRef.current = engine;

    const render = Render.create({
      element: sceneRef.current,
      engine,
      options: {
        width,
        height,
        wireframes: false,
        background: "transparent",
        pixelRatio: window.devicePixelRatio,
      },
    });

    const cx = width / 2;
    const R = 150;
    const cy = height - R - 20;

    // すり抜け対策: 壁を少し厚くし、セグメント間の重なりを増やす
    const thickness = 16;
    const baseRadius = width < 280 ? 10 : 14;
    const openingWidth = (baseRadius * 2 + 18) * 2;
    const theta = Math.asin(openingWidth / 2 / R);
    const segments = 55;

    const parts: any[] = [];
    const invisibleStyle = { visible: false };

    for (let i = 0; i <= segments; i++) {
      const startAngle = -Math.PI / 2 + theta;
      const endAngle = Math.PI * 1.5 - theta;
      const a = startAngle + (endAngle - startAngle) * (i / segments);
      const x = cx + R * Math.cos(a);
      const y = cy + R * Math.sin(a);
      // 継ぎ目の重なりを+2px→+6pxに拡大し、隙間からのすり抜けを防止
      const partLength = (R * 2 * Math.PI) / segments + 6;
      parts.push(
        Bodies.rectangle(x, y, partLength, thickness, {
          isStatic: true,
          angle: a,
          render: invisibleStyle,
          friction: 0.5,
        }),
      );
    }

    const neckHeight = 60;
    const neckCenterY = cy - R * Math.cos(theta) - neckHeight / 2;
    parts.push(
      Bodies.rectangle(
        cx - openingWidth / 2,
        neckCenterY,
        thickness,
        neckHeight,
        {
          isStatic: true,
          render: invisibleStyle,
          friction: 0.5,
        },
      ),
      Bodies.rectangle(
        cx + openingWidth / 2,
        neckCenterY,
        thickness,
        neckHeight,
        {
          isStatic: true,
          render: invisibleStyle,
          friction: 0.5,
        },
      ),
    );

    Composite.add(engine.world, parts);

    const neckTop = cy - R * Math.cos(theta) - neckHeight;

    for (let i = 0; i < countRef.current; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * (R * 0.7);
      const dropX = cx + Math.cos(angle) * distance;
      const dropY = cy + Math.sin(angle) * distance;
      const r = baseRadius - 0.8 + Math.random() * 1.6;

      const ball = Bodies.circle(dropX, dropY, r, {
        label: "strawberry",
        restitution: 0.1,
        friction: 0.2,
        frictionAir: 0.005,
        density: 0.05,
        sleepThreshold: 300,
        render: { visible: false },
      });

      Composite.add(engine.world, ball);
      spawnedCountRef.current += 1;
    }

    // 初期沈降計算: 90→60回に削減(視覚差はほぼ無いが初期化コストを削減)
    for (let i = 0; i < 60; i++) {
      Engine.update(engine, 1000 / 60);
    }

    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.2, render: { visible: false } },
    });
    Composite.add(engine.world, mouseConstraint);
    render.mouse = mouse;

    Render.run(render);
    // 固定タイムステップ化: フレーム落ち時の大移動によるすり抜けを防止
    const runner = Runner.create({ isFixed: true });
    Runner.run(runner, engine);

    const dropOne = () => {
      const dropX = cx + (Math.random() - 0.5) * 40;
      const dropY = neckTop - 50;
      const r = baseRadius - 0.8 + Math.random() * 1.6;

      const ball = Bodies.circle(dropX, dropY, r, {
        label: "strawberry",
        restitution: 0.1,
        friction: 0.2,
        frictionAir: 0.005,
        density: 0.05,
        sleepThreshold: 300,
        render: { visible: false },
      });

      Body.setVelocity(ball, {
        x: (Math.random() - 0.5) * 2,
        y: 1 + Math.random() * 2,
      });

      Composite.add(engine.world, ball);
      spawnedCountRef.current += 1;
    };

    const dropQueue = (n: number) => {
      pendingCountRef.current += n;
    };
    dropFnRef.current = dropQueue;

    const dropTicker = setInterval(() => {
      if (pendingCountRef.current > 0) {
        dropOne();
        pendingCountRef.current -= 1;
      }
    }, 90);

    // すり抜け防止: 薄い壁を高速で通過しないよう、いちごの最大速度をクランプ
    // (壁厚16pxに対し、1ステップの移動量が壁厚を超えないよう上限を設定)
    const MAX_SPEED = 12;

    Events.on(engine, "afterUpdate", () => {
      const bodies = Composite.allBodies(engine.world);
      for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        if (body.label !== "strawberry") continue;

        // 画面外に落ちたものは除去
        if (body.position.y > height + 100) {
          Composite.remove(engine.world, body);
          continue;
        }

        // 速度クランプ(すり抜け防止)
        const vx = body.velocity.x;
        const vy = body.velocity.y;
        const speed = Math.sqrt(vx * vx + vy * vy);
        if (speed > MAX_SPEED) {
          const scale = MAX_SPEED / speed;
          Body.setVelocity(body, { x: vx * scale, y: vy * scale });
        }
      }
    });

    Events.on(render, "afterRender", () => {
      const context = render.context;
      const colorHex = glassColorHex;
      const neckRightX = cx + openingWidth / 2;
      const neckLeftX = cx - openingWidth / 2;

      context.beginPath();
      context.moveTo(neckRightX, neckTop);
      context.lineTo(neckRightX, cy - R * Math.cos(theta));
      context.arc(
        cx,
        cy,
        R,
        -Math.PI / 2 + theta,
        Math.PI * 1.5 - theta,
        false,
      );
      context.lineTo(neckLeftX, neckTop);

      context.fillStyle = hexToRgba(colorHex, 0.15);
      context.fill();

      const bodies = Composite.allBodies(engine.world);

      // 変更点: fillTextの直接呼び出しをやめ、事前生成したスプライトをdrawImageで描画
      // (カラー絵文字のfillTextは非常に重く、毎フレーム×ボール数で顕著なコストになるため)
      for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        if (body.label !== "strawberry") continue;

        const r = body.circleRadius || baseRadius;
        const sprite = getStrawberrySprite(r);
        const spriteSize =
          sprite.width / Math.min(window.devicePixelRatio || 1, 2);

        context.save();
        context.translate(body.position.x, body.position.y);
        context.rotate(body.angle);
        context.drawImage(
          sprite,
          -spriteSize / 2,
          -spriteSize / 2,
          spriteSize,
          spriteSize,
        );
        context.restore();
      }

      context.lineWidth = thickness;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = hexToRgba(colorHex, 0.8);
      context.stroke();

      const currentCount = countRef.current;
      const currentInterval = intervalMinutesRef.current;

      context.textAlign = "center";
      context.textBaseline = "middle";
      context.strokeStyle = colorHex;
      context.fillStyle = "rgba(255, 255, 255, 1.0)";

      context.font = "bold 90px sans-serif";
      context.lineWidth = 6;
      context.strokeText(currentCount.toString(), cx, cy - 20);
      context.fillText(currentCount.toString(), cx, cy - 20);

      context.font = "bold 16px sans-serif";
      context.lineWidth = 4;
      const totalMins = currentCount * currentInterval;
      const calcText = `= ${currentCount} × ${currentInterval} = ${totalMins} 分`;
      context.strokeText(calcText, cx, cy + 45);
      context.fillText(calcText, cx, cy + 45);
    });

    bodiesApiRef.current = { Bodies, Composite, Body, engine };

    return () => {
      clearInterval(dropTicker);
      Render.stop(render);
      Runner.stop(runner);
      Engine.clear(engine);
      if (render.canvas) render.canvas.remove();
      engineRef.current = null;
      dropFnRef.current = null;
    };
  }, [isLoaded, width, height, glassColorHex]);

  useEffect(() => {
    if (!isLoaded || !dropFnRef.current || !bodiesApiRef.current) return;

    if (count === 0) {
      const { Composite, engine } = bodiesApiRef.current;
      const bodies = Composite.allBodies(engine.world);
      const strawberries = bodies.filter((b: any) => b.label === "strawberry");

      strawberries.forEach((b: any) => {
        Composite.remove(engine.world, b);
      });

      spawnedCountRef.current = 0;
      pendingCountRef.current = 0;
      return;
    }

    const diff = count - spawnedCountRef.current - pendingCountRef.current;
    if (diff > 0) {
      dropFnRef.current(diff);
    }
  }, [count, isLoaded]);

  return (
    <div
      ref={sceneRef}
      className="rounded-[30px] overflow-hidden shadow-inner bg-black/5"
      style={{ width, height }}
    />
  );
}
