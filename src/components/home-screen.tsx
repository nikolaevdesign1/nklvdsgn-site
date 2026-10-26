"use client";

import gsap from "gsap";
import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { AnnouncementChip } from "@/components/announcement-chip";
import { HomePreloader } from "@/components/home-preloader";
import { SiteHeader } from "@/components/site-header";
import { projects } from "@/data/projects";

const studioLine =
  "Interfaces and brands for SaaS, AI, and the products around them. Screens a company ships, and the identity that holds a product together.";

function videoUrl(value: string) {
  const url = value.trim();
  if (!url) return "";
  if (url.startsWith("/") || /^https?:\/\//i.test(url)) return url;
  return "";
}

function drawCover(context: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const naturalWidth = image.naturalWidth || width;
  const naturalHeight = image.naturalHeight || height;
  const scale = Math.max(width / naturalWidth, height / naturalHeight);
  const drawWidth = naturalWidth * scale;
  const drawHeight = naturalHeight * scale;
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

type CoverBuffer = {
  width: number;
  height: number;
  color: boolean;
  sheet: HTMLCanvasElement;
};

type PressHold = {
  track: (clientX: number, clientY: number) => void;
  pressIn: () => void;
  release: (tap: boolean) => void;
  kill: () => void;
};

const coverBuffers = new WeakMap<HTMLElement, CoverBuffer>();

function coverBuffer(frame: HTMLElement): CoverBuffer | null {
  const rect = frame.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const color = frame.dataset.homeCenter === "true";
  const cached = coverBuffers.get(frame);
  if (cached && cached.width === width && cached.height === height && cached.color === color) return cached;
  const img = frame.querySelector("img");
  if (!(img instanceof HTMLImageElement) || !img.complete || img.naturalWidth === 0) return null;
  const source = document.createElement("canvas");
  source.width = width;
  source.height = height;
  const sourceContext = source.getContext("2d");
  if (!sourceContext) return null;
  sourceContext.filter = color ? "none" : "grayscale(1)";
  drawCover(sourceContext, img, width, height);
  sourceContext.filter = "none";
  sourceContext.strokeStyle = "rgba(255,255,255,0.72)";
  sourceContext.lineWidth = 2;
  sourceContext.strokeRect(1.5, 1.5, width - 3, height - 3);
  const buffer = { width, height, color, sheet: source };
  coverBuffers.set(frame, buffer);
  return buffer;
}

function createPress(film: HTMLElement): PressHold {
  let frame: HTMLElement | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let context: CanvasRenderingContext2D | null = null;
  let buffer: CoverBuffer | null = null;
  let originX = 0;
  let originY = 0;
  let amount = 0;
  let ripple = 0;
  let tween: gsap.core.Tween | null = null;
  let raf = 0;
  let dead = false;

  const plateOf = (node: HTMLElement | null) => node?.querySelector<HTMLElement>(".home-frame-plate") ?? null;

  const clearPlate = (node: HTMLElement | null) => {
    const plate = plateOf(node);
    if (!plate) return;
    plate.style.visibility = "";
    plate.style.transform = "";
  };

  const clothPoint = (x: number, y: number, width: number, height: number) => {
    const dx = x - originX;
    const dy = y - originY;
    const dist = Math.hypot(dx, dy);
    const safe = dist || 1;
    const nx = dx / safe;
    const ny = dy / safe;
    const radius = Math.hypot(width, height) * 1.08;
    const reach = Math.max(0, 1 - dist / radius);
    const fall = reach * reach * (3 - 2 * reach);
    const gather = fall * 0.11 * amount;
    const wave = Math.sin(dist * 0.055 - ripple * 4.2);
    const fold = wave * fall * Math.min(width, height) * 0.012 * amount;
    return {
      x: x - dx * gather - ny * fold,
      y: y - dy * gather + nx * fold * 0.7,
    };
  };

  const drawTriangle = (
    image: HTMLCanvasElement,
    sx0: number,
    sy0: number,
    sx1: number,
    sy1: number,
    sx2: number,
    sy2: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ) => {
    if (!context) return;
    const denom = sx0 * (sy1 - sy2) + sx1 * (sy2 - sy0) + sx2 * (sy0 - sy1);
    if (Math.abs(denom) < 0.001) return;
    const a = (x0 * (sy1 - sy2) + x1 * (sy2 - sy0) + x2 * (sy0 - sy1)) / denom;
    const b = (y0 * (sy1 - sy2) + y1 * (sy2 - sy0) + y2 * (sy0 - sy1)) / denom;
    const c = (x0 * (sx2 - sx1) + x1 * (sx0 - sx2) + x2 * (sx1 - sx0)) / denom;
    const d = (y0 * (sx2 - sx1) + y1 * (sx0 - sx2) + y2 * (sx1 - sx0)) / denom;
    const e = (x0 * (sx1 * sy2 - sx2 * sy1) + x1 * (sx2 * sy0 - sx0 * sy2) + x2 * (sx0 * sy1 - sx1 * sy0)) / denom;
    const f = (y0 * (sx1 * sy2 - sx2 * sy1) + y1 * (sx2 * sy0 - sx0 * sy2) + y2 * (sx0 * sy1 - sx1 * sy0)) / denom;
    context.save();
    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.lineTo(x2, y2);
    context.closePath();
    context.clip();
    context.setTransform(a, b, c, d, e, f);
    context.drawImage(image, 0, 0);
    context.restore();
  };

  const paint = () => {
    if (dead || !frame) return;
    const next = coverBuffer(frame);
    if (!next) return;
    const pad = Math.round(Math.min(next.width, next.height) * 0.22);
    const viewW = next.width + pad * 2;
    const viewH = next.height + pad * 2;
    if (!canvas || !context || buffer?.width !== next.width || buffer.height !== next.height) {
      canvas?.remove();
      canvas = document.createElement("canvas");
      canvas.className = "home-press-canvas";
      canvas.setAttribute("aria-hidden", "true");
      context = canvas.getContext("2d");
      if (!context) return;
    }
    buffer = next;
    if (!canvas || !context) return;
    canvas.width = viewW;
    canvas.height = viewH;
    canvas.style.left = `${-pad}px`;
    canvas.style.top = `${-pad}px`;
    canvas.style.width = `${viewW}px`;
    canvas.style.height = `${viewH}px`;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, viewW, viewH);
    const cols = 16;
    const rows = 10;
    const points: { x: number; y: number }[] = [];
    for (let row = 0; row <= rows; row += 1) {
      for (let col = 0; col <= cols; col += 1) {
        const sx = (next.width * col) / cols;
        const sy = (next.height * row) / rows;
        const moved = clothPoint(sx, sy, next.width, next.height);
        points.push({ x: moved.x + pad, y: moved.y + pad });
      }
    }
    const stride = cols + 1;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const i = row * stride + col;
        const sx = (next.width * col) / cols;
        const sy = (next.height * row) / rows;
        const sx2 = (next.width * (col + 1)) / cols;
        const sy2 = (next.height * (row + 1)) / rows;
        const p00 = points[i];
        const p10 = points[i + 1];
        const p01 = points[i + stride];
        const p11 = points[i + stride + 1];
        drawTriangle(next.sheet, sx, sy, sx2, sy, sx, sy2, p00.x, p00.y, p10.x, p10.y, p01.x, p01.y);
        drawTriangle(next.sheet, sx2, sy, sx2, sy2, sx, sy2, p10.x, p10.y, p11.x, p11.y, p01.x, p01.y);
      }
    }
    const dentX = originX + pad;
    const dentY = originY + pad;
    const dentRadius = Math.min(next.width, next.height) * 0.85;
    const dent = context.createRadialGradient(dentX, dentY, 6, dentX, dentY, dentRadius);
    dent.addColorStop(0, `rgba(0,0,0,${0.1 * amount})`);
    dent.addColorStop(0.35, `rgba(0,0,0,${0.04 * amount})`);
    dent.addColorStop(1, "rgba(0,0,0,0)");
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = dent;
    context.fillRect(0, 0, viewW, viewH);
    if (canvas.parentElement !== frame) frame.append(canvas);
    const plate = plateOf(frame);
    if (plate) plate.style.visibility = "hidden";
    frame.style.zIndex = "6";
  };

  const schedule = () => {
    if (dead || raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (dead) return;
      paint();
    });
  };

  const animateCloth = (
    targetAmount: number,
    targetRipple: number,
    duration: number,
    ease: string,
    done?: () => void,
  ) => {
    tween?.kill();
    const state = { amount, ripple };
    tween = gsap.to(state, {
      amount: targetAmount,
      ripple: targetRipple,
      duration,
      ease,
      onUpdate: () => {
        amount = state.amount;
        ripple = state.ripple;
        schedule();
      },
      onComplete: done,
    });
  };

  const detach = () => {
    canvas?.remove();
    if (frame) frame.style.zIndex = "";
    clearPlate(frame);
  };

  return {
    track(clientX, clientY) {
      if (dead) return;
      const next = frameAt(film, clientX, clientY);
      if (!next) return;
      const rect = next.getBoundingClientRect();
      originX = Math.min(Math.max(0, rect.width - 1), Math.max(0, clientX - rect.left));
      originY = Math.min(Math.max(0, rect.height - 1), Math.max(0, clientY - rect.top));
      if (next !== frame) {
        canvas?.remove();
        const previous = frame?.querySelector("img");
        if (previous instanceof HTMLImageElement && !frame?.querySelector(".home-press-canvas")) {
          previous.style.visibility = "";
        }
        clearPlate(frame);
        frame = next;
        canvas = null;
        context = null;
        buffer = null;
      }
      schedule();
    },
    pressIn() {
      if (dead) return;
      animateCloth(0.42, 0.45, 0.55, "power2.out");
    },
    release(tap) {
      if (dead) return;
      const easeOut = () => {
        if (dead) return;
        animateCloth(0, ripple + 0.45, 0.95, "elastic.out(1, 0.45)", () => {
          if (dead) return;
          dead = true;
          detach();
        });
      };
      if (tap && amount < 0.98) animateCloth(1, 1, 0.42, "back.out(1.6)", easeOut);
      else easeOut();
    },
    kill() {
      if (dead) return;
      dead = true;
      tween?.kill();
      if (raf) cancelAnimationFrame(raf);
      detach();
    },
  };
}

function frameAt(film: HTMLElement, clientX: number, clientY: number) {
  let best: HTMLElement | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const frame of film.querySelectorAll<HTMLElement>("[data-home-frame]")) {
    const rect = frame.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) return frame;
    if (clientY < rect.top - 2 || clientY > rect.bottom + 2) continue;
    const dx = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0;
    if (dx < bestDistance) {
      bestDistance = dx;
      best = frame;
    }
  }
  return best;
}

function measureFilm(film: HTMLElement) {
  const reel = film.closest("[data-home-reel]");
  const frames = film.querySelectorAll<HTMLElement>(".home-frame");
  const first = frames[0];
  const second = frames[1];
  if (!(reel instanceof HTMLElement) || !first || !second) return null;
  const firstRect = first.getBoundingClientRect();
  const step = second.getBoundingClientRect().left - firstRect.left;
  const card = firstRect.width;
  const reelWidth = reel.getBoundingClientRect().width;
  if (card <= 0 || step <= 0 || reelWidth <= 0) return null;
  return { step, origin: (reelWidth - card) / 2 };
}

function readFilmX(film: HTMLElement) {
  const value = getComputedStyle(film).transform;
  if (!value || value === "none") return 0;
  return new DOMMatrix(value).m41;
}

function markCenter(film: HTMLElement, slot: number) {
  film.querySelectorAll<HTMLElement>("[data-home-frame]").forEach((frame, index) => {
    if (index === slot) frame.dataset.homeCenter = "true";
    else delete frame.dataset.homeCenter;
  });
}

function HomeInterference() {
  const id = useId().replace(/:/g, "");
  const grain = `${id}-grain`;
  const bands = `${id}-bands`;

  return (
    <div className="home-interference">
      <svg className="home-interference-grain" aria-hidden focusable="false">
        <filter id={grain} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${grain})`} />
      </svg>
      <svg className="home-interference-bands" aria-hidden focusable="false">
        <filter id={bands} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence
            type="turbulence"
            baseFrequency="0.012 0.2"
            numOctaves="1"
            seed="5"
            stitchTiles="stitch"
            result="noise"
          />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.34 0.34 0.34 0 -0.06"
            result="alpha"
          />
          <feFlood floodColor="#2bfff8" floodOpacity="0.7" result="ice" />
          <feComposite in="ice" in2="alpha" operator="in" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${bands})`} />
      </svg>
    </div>
  );
}

function WorkLine({
  title,
  field,
  tone,
}: {
  title: string;
  field: string;
  tone: "light" | "ink";
}) {
  const color = tone === "ink" ? "text-[#0a0a0b]" : "text-foreground";
  return (
    <span
      className={`home-caption-line flex w-full items-center justify-center gap-3 px-3 py-2.5 text-center font-sans text-[12px] leading-none whitespace-nowrap md:justify-between md:text-left ${color}`}
    >
      <span className="min-w-0 truncate text-center md:text-left">{title}</span>
      <span className="shrink-0 text-center md:text-right">{field}</span>
    </span>
  );
}

const DRAG_ARM = 6;
const FLICK_SPEED = 0.35;

function pointerVelocity(samples: { x: number; t: number }[], x: number, now: number) {
  const first = samples[0];
  if (!first) return 0;
  const span = now - first.t;
  if (span < 16) return 0;
  return (x - first.x) / span;
}

function flickOrNearest(startSlot: number, travel: number, step: number, velocity: number, nearest: number) {
  const distance = Math.abs(travel);
  const flick = distance >= DRAG_ARM && distance < step * 1.15 && Math.abs(velocity) >= FLICK_SPEED;
  if (!flick) return nearest;
  return Math.round(startSlot) + (velocity < 0 ? 1 : -1);
}

export function HomeScreen() {
  const [booting, setBooting] = useState(true);
  const [index, setIndex] = useState(0);
  const [run, setRun] = useState(0);
  const filmRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef(false);
  const blockClickRef = useRef(false);
  const pressRef = useRef<PressHold | null>(null);
  const settleRef = useRef<gsap.core.Tween | null>(null);
  const stopGestureRef = useRef<(() => void) | null>(null);
  const finishBoot = useCallback(() => setBooting(false), []);
  const current = projects[index] ?? projects[0];
  const count = projects.length;
  const clip = videoUrl(current.video);
  const strip = [0, 1, 2].flatMap((copy) =>
    projects.map((project, projectIndex) => ({
      project,
      projectIndex,
      key: `${copy}-${project.id}`,
    })),
  );

  const choose = useCallback((next: number) => {
    const root = document.querySelector<HTMLElement>("[data-home-screen]");
    root?.style.setProperty("--home-span", "8s");
    setIndex(((next % projects.length) + projects.length) % projects.length);
    setRun((value) => value + 1);
  }, []);

  const onFilmPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const film = filmRef.current;
    const metrics = film ? measureFilm(film) : null;
    if (!film || !metrics) return;
    if (document.querySelector("[data-home-screen]")?.getAttribute("data-home-ready") !== "true") return;

    stopGestureRef.current?.();
    settleRef.current?.kill();
    pressRef.current?.kill();
    gestureRef.current = true;
    blockClickRef.current = false;

    const bar = document.querySelector<HTMLElement>("[data-home-bar]");
    if (bar) bar.style.animationPlayState = "paused";

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointerId = event.pointerId;
    const startClientX = event.clientX;
    const originX = readFilmX(film);
    let lastX = originX;
    let moved = false;
    const samples = [{ x: startClientX, t: performance.now() }];
    let shown = count + index;
    const maxSlot = count * 3 - 1;
    film.style.transition = "none";
    film.style.transform = `translateX(${originX}px)`;
    film.classList.add("is-dragging");

    const press = reduced ? null : createPress(film);
    pressRef.current = press;
    press?.track(event.clientX, event.clientY);
    press?.pressIn();

    const showSlot = (slot: number) => {
      const next = Math.min(maxSlot, Math.max(0, slot));
      if (next === shown) return;
      shown = next;
      markCenter(film, next);
    };

    const endGesture = () => {
      requestAnimationFrame(() => {
        gestureRef.current = false;
      });
    };

    const releaseFreeze = () => {
      film.style.transition = "none";
      film.style.removeProperty("transform");
      void film.offsetWidth;
      film.style.removeProperty("transition");
      film.classList.remove("is-dragging");
    };

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      samples.push({ x: ev.clientX, t: performance.now() });
      if (samples.length > 12) samples.splice(1, samples.length - 12);
      const dx = ev.clientX - startClientX;
      if (!moved && Math.abs(dx) < DRAG_ARM) {
        press?.track(ev.clientX, ev.clientY);
        return;
      }
      if (!moved) {
        moved = true;
        blockClickRef.current = true;
      }
      const minX = metrics.origin - maxSlot * metrics.step;
      const maxX = metrics.origin;
      const x = Math.min(maxX, Math.max(minX, originX + dx));
      lastX = x;
      film.style.transform = `translateX(${x}px)`;
      showSlot(Math.round((metrics.origin - x) / metrics.step));
      press?.track(ev.clientX, ev.clientY);
      ev.preventDefault();
    };

    const finish = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      stopGestureRef.current = null;
      press?.release(!moved);
      if (!moved) {
        const frame = frameAt(film, ev.clientX, ev.clientY);
        const slot = frame ? Array.prototype.indexOf.call(film.children, frame) : -1;
        const currentSlot = count + index;
        releaseFreeze();
        if (slot >= 0 && slot !== currentSlot) {
          choose(slot % count);
          endGesture();
        } else {
          const barNow = document.querySelector<HTMLElement>("[data-home-bar]");
          gestureRef.current = false;
          if (barNow) barNow.style.animationPlayState = "running";
        }
        return;
      }
      const now = performance.now();
      samples.push({ x: ev.clientX, t: now });
      const travel = ev.clientX - startClientX;
      const velocity = pointerVelocity(samples, ev.clientX, now);
      const startSlot = (metrics.origin - originX) / metrics.step;
      const nearest = Math.round((metrics.origin - lastX) / metrics.step);
      const slot = Math.min(
        maxSlot,
        Math.max(0, flickOrNearest(startSlot, travel, metrics.step, velocity, nearest)),
      );
      const target = metrics.origin - slot * metrics.step;
      const apply = () => {
        if (!film.isConnected) {
          gestureRef.current = false;
          return;
        }
        const projectIndex = ((slot % count) + count) % count;
        const middle = count + projectIndex;
        markCenter(film, middle);
        film.style.transition = "none";
        film.style.setProperty("--film-index", String(middle));
        film.style.removeProperty("transform");
        void film.offsetWidth;
        film.style.removeProperty("transition");
        film.classList.remove("is-dragging");
        settleRef.current = null;
        choose(projectIndex);
        endGesture();
      };
      if (reduced || Math.abs(lastX - target) < 0.5) {
        apply();
        return;
      }
      const state = { x: lastX };
      settleRef.current = gsap.to(state, {
        x: target,
        duration: 0.68,
        ease: "power3.out",
        onUpdate: () => {
          film.style.transform = `translateX(${state.x}px)`;
          showSlot(Math.round((metrics.origin - state.x) / metrics.step));
        },
        onComplete: apply,
      });
    };

    const stop = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
    stopGestureRef.current = stop;
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  };

  const onFilmClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!blockClickRef.current) return;
    blockClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtml = html.style.overflow;
    const previousBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    window.scrollTo(0, 0);
    return () => {
      html.style.overflow = previousHtml;
      body.style.overflow = previousBody;
      stopGestureRef.current?.();
      settleRef.current?.kill();
      pressRef.current?.kill();
      gestureRef.current = false;
      document.querySelectorAll(".home-press-canvas").forEach((node) => node.remove());
      document.querySelectorAll<HTMLElement>(".home-frame-plate").forEach((node) => {
        node.style.transform = "";
      });
      document.querySelectorAll<HTMLImageElement>(".home-frame img").forEach((node) => {
        node.style.visibility = "";
      });
    };
  }, []);

  return (
    <div
      data-home-screen=""
      data-home-ready={booting ? "false" : "true"}
      data-home-project={current.id}
      className="fixed inset-0 overflow-hidden bg-[#0a0a0b] text-foreground [--home-span:8s]"
    >
      {booting ? <HomePreloader onDone={finishBoot} /> : null}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        {projects.map((project, imageIndex) => (
          <Image
            key={project.id}
            src={project.image}
            alt=""
            fill
            priority={imageIndex === index}
            sizes="100vw"
            className={`object-cover transition-opacity duration-500 motion-reduce:transition-none ${
              project.id === current.id ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        {clip ? (
          <video
            data-home-video=""
            key={current.id}
            src={clip}
            poster={current.image}
            autoPlay
            muted
            playsInline
            onLoadedMetadata={(event) => {
              const duration = event.currentTarget.duration;
              if (!Number.isFinite(duration) || duration <= 0) return;
              event.currentTarget.closest<HTMLElement>("[data-home-screen]")?.style.setProperty(
                "--home-span",
                `${duration}s`,
              );
            }}
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-[#0a0a0b]/88" />
        <HomeInterference />
      </div>
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <div className="relative z-20 shrink-0">
          <SiteHeader />
        </div>
        <div className="min-h-0 flex-1">
          <div className="home-slider-slot" data-home-slider="">
            <div className="home-slider-copy pointer-events-none flex flex-col items-center gap-3 text-center md:items-start md:text-left">
                <AnnouncementChip />
                <div className="flex w-full flex-col items-center gap-3 text-center md:items-start md:text-left min-[1100px]:flex-row min-[1100px]:items-start min-[1100px]:justify-between min-[1100px]:gap-16">
                <p
                  data-home-title=""
                  className="pointer-events-auto font-sans text-[32px] leading-[1.05] text-foreground sm:text-[40px] sm:leading-none"
                >
                  Creating design products
                </p>
                <p
                  data-home-description=""
                  className="pointer-events-auto max-w-[35rem] text-center font-sans text-[15px] leading-[1.45] text-foreground/90 md:text-right min-[1100px]:w-[35rem] min-[1100px]:shrink-0"
                >
                  {studioLine}
                </p>
                </div>
            </div>
            <div data-home-reel="" className="w-full shrink-0">
            <div
              data-home-film=""
              className="home-stage relative overflow-hidden"
              onPointerDown={onFilmPointerDown}
              onClickCapture={onFilmClickCapture}
              onDragStart={(event) => event.preventDefault()}
            >
              <div className="home-film-scene">
                <div className="home-film-press">
                  <div
                    ref={filmRef}
                    className="home-film flex h-full w-max"
                    style={{ "--film-index": `${count + index}` } as CSSProperties}
                  >
                      {strip.map((item, slot) => {
                        const center = slot === count + index;
                        const frameClass = "home-frame relative h-full shrink-0 cursor-pointer";
                        const controlClass = "absolute inset-0 block cursor-pointer";
                        const cover = (
                          <Image
                            src={item.project.image}
                            alt=""
                            fill
                            draggable={false}
                            priority={Math.abs(slot - (count + index)) <= 2}
                            sizes="25vw"
                            className="object-cover"
                          />
                        );
                        if (center) {
                          return (
                            <div
                              key={item.key}
                              data-home-frame={item.project.id}
                              data-home-center="true"
                              className={frameClass}
                            >
                              <div className="home-frame-plate">
                                <div className="home-frame-clip">
                                  <Link
                                    href={`/works/${item.project.id}`}
                                    aria-label={item.project.title}
                                    aria-current="true"
                                    className={controlClass}
                                  >
                                    {cover}
                                  </Link>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div
                            key={item.key}
                            data-home-frame={item.project.id}
                            className={frameClass}
                          >
                            <div className="home-frame-plate">
                              <div className="home-frame-clip">
                                <button
                                  type="button"
                                  aria-label={item.project.title}
                                  aria-hidden
                                  tabIndex={-1}
                                  className={controlClass}
                                >
                                  {cover}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div data-home-caption="" className="home-caption-lane">
                <Link
                  href={`/works/${current.id}`}
                  data-home-active=""
                  aria-live="polite"
                  className="home-caption relative block cursor-pointer no-underline"
                  style={{ width: "var(--film-card)", flex: "0 0 auto" }}
                >
                  <span className="relative block w-full">
                    <WorkLine title={current.title} field={current.field} tone="light" />
                    {booting ? null : (
                      <span
                        key={run}
                        aria-hidden
                        data-home-bar=""
                        onAnimationEnd={(event) => {
                          if (gestureRef.current) return;
                          if (event.animationName !== "home-bar") return;
                          if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
                          const target = event.target;
                          if (!(target instanceof Element) || !target.hasAttribute("data-home-bar")) return;
                          choose(index + 1);
                        }}
                        className="home-bar absolute inset-0 overflow-hidden bg-white"
                      >
                        <span className="absolute inset-0">
                          <WorkLine title={current.title} field={current.field} tone="ink" />
                        </span>
                      </span>
                    )}
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
