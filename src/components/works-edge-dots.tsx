"use client";

import { useEffect, useRef } from "react";

const wash =
  "radial-gradient(ellipse at 68% 12%, rgba(184,212,255,0.22), transparent 46%), radial-gradient(ellipse at 24% 70%, rgba(242,242,243,0.07), transparent 50%)";

function fadeAt(y: number, height: number) {
  const fromOuter = y / height;
  const intoBlack = 1 - fromOuter * fromOuter;
  const lip = Math.min(1, y / (height * 0.16));
  return intoBlack * (0.25 + 0.75 * lip * lip * (3 - 2 * lip));
}

function paint(canvas: HTMLCanvasElement, reduced: boolean, now: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const bounds = canvas.getBoundingClientRect();
  const width = bounds.width;
  const height = bounds.height;
  if (width < 2 || height < 2) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const nextWidth = Math.round(width * dpr);
  const nextHeight = Math.round(height * dpr);
  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const t = reduced ? 0 : now / 1000;
  const pitch = 8;
  const domeY = height * 0.22;
  ctx.fillStyle = "#f2f2f3";
  for (let y = pitch; y < height; y += pitch) {
    const fade = fadeAt(y, height);
    if (fade < 0.04) continue;
    const wave = Math.sin(y * 0.02 + t * 0.8) * 8 + Math.sin(t * 0.35) * 3;
    for (let x = pitch; x < width; x += pitch) {
      const dome = Math.hypot((x - width * 0.66) / (width * 0.62), (y - domeY) / (height * 0.72));
      const ridge = Math.sin(x * 0.02 + y * 0.01 + t * 1.1 + wave * 0.02);
      const grain = dome < 1 ? 0.14 + (1 - dome) * 0.48 * (0.45 + ridge * 0.55) : 0.04 + Math.max(0, ridge) * 0.07;
      const alpha = grain * fade;
      if (alpha < 0.06) continue;
      ctx.globalAlpha = alpha;
      ctx.fillRect(x, y + wave * (1 - Math.min(dome, 1)) * 0.1, 1.4, 1.4);
    }
  }
  ctx.globalAlpha = 1;
}

export function WorksEdgeDots() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = reducedQuery.matches;
    let frame = 0;
    let visible = true;

    const draw = (now: number) => {
      paint(canvas, reduced, now);
      frame = visible && !reduced ? requestAnimationFrame(draw) : 0;
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !frame) frame = requestAnimationFrame(draw);
    });
    observer.observe(canvas);
    const onReduce = () => {
      reduced = reducedQuery.matches;
      if (reduced) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      if (!frame) frame = requestAnimationFrame(draw);
    };
    reducedQuery.addEventListener("change", onReduce);
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      reducedQuery.removeEventListener("change", onReduce);
    };
  }, []);

  const mask = "linear-gradient(to bottom, transparent 0%, #000 14%, #000 36%, rgba(0,0,0,0.55) 68%, transparent 100%)";

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[260px] sm:h-[360px]"
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    >
      <div className="absolute inset-0" style={{ background: wash }} />
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </div>
  );
}
