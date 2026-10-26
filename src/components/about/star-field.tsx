"use client";

import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  size: number;
  depth: number;
  phase: number;
  speed: number;
  tint: string;
};

const SCAN = "184, 212, 255";

function rng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeStars(width: number, height: number): Star[] {
  const random = rng(2026);
  const count = Math.min(720, Math.max(220, Math.round((width * height) / 2400)));
  return Array.from({ length: count }, () => {
    const pick = random();
    const tint = pick < 0.12 ? SCAN : pick < 0.14 ? "255, 51, 85" : "242, 242, 243";
    return {
      x: random() * width,
      y: random() * height,
      size: 0.4 + random() ** 3 * 1.5,
      depth: 0.2 + random() * 0.8,
      phase: random() * Math.PI * 2,
      speed: 0.4 + random() * 1.6,
      tint,
    };
  });
}

export function StarField({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const random = rng(7);

    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let raf = 0;
    let visible = true;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let shot: { x: number; y: number; age: number } | null = null;
    let nextShot = 3;
    let last = 0;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = makeStars(width, height);
    };

    const drawShot = (dt: number, t: number) => {
      if (!shot && t > nextShot) {
        shot = { x: width * (0.45 + random() * 0.55), y: height * random() * 0.3, age: 0 };
      }
      if (!shot) return;
      shot.age += dt;
      const life = 0.95;
      const progress = shot.age / life;
      if (progress >= 1) {
        shot = null;
        nextShot = t + 5 + random() * 7;
        return;
      }
      const hx = shot.x - progress * 780;
      const hy = shot.y + progress * 330;
      const tail = 170;
      const norm = Math.hypot(780, 330);
      const tx = hx + (780 / norm) * tail;
      const ty = hy - (330 / norm) * tail;
      const alpha = Math.sin(progress * Math.PI);
      const grad = ctx.createLinearGradient(hx, hy, tx, ty);
      grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      grad.addColorStop(0.15, `rgba(${SCAN}, ${alpha * 0.55})`);
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    };

    const draw = (now: number) => {
      const t = motion.matches ? 0 : now / 1000;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;

      if (!motion.matches) {
        pointer.x += (pointer.tx - pointer.x) * 0.05;
        pointer.y += (pointer.ty - pointer.y) * 0.05;
      }

      ctx.clearRect(0, 0, width, height);
      for (const star of stars) {
        const twinkle = 0.55 + 0.45 * Math.sin(t * star.speed + star.phase);
        const alpha = (0.22 + 0.78 * star.depth) * twinkle;
        const x = star.x + pointer.x * star.depth * 18;
        const y = ((star.y + t * star.depth * 2.4 + pointer.y * star.depth * 18) % height + height) % height;
        ctx.fillStyle = `rgba(${star.tint}, ${alpha})`;
        ctx.fillRect(x - star.size / 2, y - star.size / 2, star.size, star.size);
        if (star.size > 1.35) {
          const arm = star.size * 4.5;
          ctx.fillRect(x - arm, y - 0.4, arm * 2, 0.8);
          ctx.fillRect(x - 0.4, y - arm, 0.8, arm * 2);
        }
      }
      if (!motion.matches) drawShot(dt, t);
    };

    const loop = (now: number) => {
      if (visible) draw(now);
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      if (motion.matches) {
        draw(0);
      } else {
        raf = requestAnimationFrame(loop);
      }
    };

    const onMove = (event: PointerEvent) => {
      pointer.tx = event.clientX / (window.innerWidth || 1) - 0.5;
      pointer.ty = event.clientY / (window.innerHeight || 1) - 0.5;
    };

    resize();
    start();

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (motion.matches) draw(0);
    });
    resizeObserver.observe(canvas);
    const visibility = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
    });
    visibility.observe(canvas);
    motion.addEventListener("change", start);
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      visibility.disconnect();
      motion.removeEventListener("change", start);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={`absolute inset-0 size-full ${className}`} />;
}
