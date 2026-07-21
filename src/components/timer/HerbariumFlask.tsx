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
  width = 320,
  height = 420,
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
    engine.positionIterations = 16;
    engine.velocityIterations = 12;
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
    const cy = height - (height >= 380 ? 210 : 180);
    const R = Math.min(width, height) * 0.35;

    const thickness = 14;
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
      const partLength = (R * 2 * Math.PI) / segments + 2;
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

    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.2, render: { visible: false } },
    });
    Composite.add(engine.world, mouseConstraint);
    render.mouse = mouse;

    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);

    const neckTop = cy - R * Math.cos(theta) - neckHeight;

    const dropOne = () => {
      if (spawnedCountRef.current >= 200) return;

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

    dropQueue(count);

    const fillStyleRgba = hexToRgba(glassColorHex, 0.15);
    const strokeStyleRgba = hexToRgba(glassColorHex, 0.8);
    const neckRightX = cx + openingWidth / 2;
    const neckLeftX = cx - openingWidth / 2;

    Events.on(render, "afterRender", () => {
      const context = render.context;

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

      context.fillStyle = fillStyleRgba;
      context.fill();

      const bodies = Composite.allBodies(engine.world);

      bodies.forEach((body: any) => {
        if (body.label === "strawberry") {
          const r = body.circleRadius || baseRadius;
          const fontSize = r * 2.4;
          context.save();
          context.globalAlpha = 1.0;
          context.fillStyle = "#000000";
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.font = `${fontSize}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
          context.translate(body.position.x, body.position.y);
          context.rotate(body.angle);
          context.fillText("🍓", 0, 0);
          context.restore();
        }
      });

      context.lineWidth = thickness;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = strokeStyleRgba;
      context.stroke();

      const currentCount = countRef.current;
      const currentInterval = intervalMinutesRef.current;

      context.textAlign = "center";
      context.textBaseline = "middle";
      context.strokeStyle = glassColorHex;
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

    Events.on(engine, "afterUpdate", () => {
      const bodies = Composite.allBodies(engine.world);
      bodies.forEach((body: any) => {
        if (body.position.y > height + 100) {
          Composite.remove(engine.world, body);
        }
      });
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
