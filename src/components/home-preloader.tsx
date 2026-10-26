"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

const welcome = "welcome to uixcorp.com";
const success = "connection success";
const digits = "0123456789";

const PITCH = 14;
const LEVELS = 24;
const REST_ALPHA = 0.18;
const PEAK_ALPHA = 0.34;
const DOT = 7;
const PULSE_SPEED = 300;
const PULSE_WIDTH = 22;
const PULSE_LIFE = 2.4;
const ice = [184, 212, 255];
const fg = [242, 242, 243];

function scramble(to: string, frame: number) {
  if (frame >= 8) return to;
  let next = "";
  for (let index = 0; index < to.length; index += 1) {
    const character = to[index] ?? "";
    if (character === " ") {
      next += " ";
      continue;
    }
    if (frame > index * 2 + 4) next += character;
    else next += digits[Math.floor(Math.random() * digits.length)];
  }
  return next;
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function softDot(red: number, green: number, blue: number) {
  const sprite = document.createElement("canvas");
  sprite.width = DOT;
  sprite.height = DOT;
  const context = sprite.getContext("2d");
  if (!context) return sprite;
  const image = context.createImageData(DOT, DOT);
  const mid = (DOT - 1) / 2;
  const sigma = 1.45;
  for (let y = 0; y < DOT; y += 1) {
    for (let x = 0; x < DOT; x += 1) {
      const dx = x - mid;
      const dy = y - mid;
      const weight = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      const pixel = (y * DOT + x) * 4;
      image.data[pixel] = red;
      image.data[pixel + 1] = green;
      image.data[pixel + 2] = blue;
      image.data[pixel + 3] = Math.round(weight * 255);
    }
  }
  context.putImageData(image, 0, 0);
  return sprite;
}

type Pulse = { x: number; y: number; born: number; strength: number };

function NeuralField({ focusRef }: { focusRef: RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !ctx) return;
    ctx.imageSmoothingEnabled = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sprites = Array.from({ length: LEVELS + 1 }, (_, level) => {
      const mix = smoothstep(LEVELS * 0.62, LEVELS, level);
      const [red, green, blue] = fg.map((channel, index) => Math.round(channel + ((ice[index] ?? channel) - channel) * mix));
      return softDot(red ?? 242, green ?? 242, blue ?? 243);
    });

    let width = 0;
    let height = 0;
    let xs = new Float32Array(0);
    let ys = new Float32Array(0);
    let mask = new Float32Array(0);
    let levels = new Uint8Array(0);
    let order = new Uint32Array(0);
    const starts = new Uint32Array(LEVELS + 2);
    const fillAt = new Uint32Array(LEVELS + 2);
    const pulses: Pulse[] = [];
    let nextPulse = 0;
    let started = 0;
    let raf = 0;

    const layout = () => {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(height));

      const focus = focusRef.current?.getBoundingClientRect();
      const cx = focus ? focus.left + focus.width / 2 - bounds.left : width / 2;
      const cy = focus ? focus.top + focus.height / 2 - bounds.top : height / 2;
      const rx = (focus ? focus.width / 2 : 200) + 48;
      const ry = (focus ? focus.height / 2 : 40) + 36;

      const cols = Math.ceil(width / PITCH);
      const rows = Math.ceil(height / PITCH);
      const offsetX = (width - (cols - 1) * PITCH) / 2;
      const offsetY = (height - (rows - 1) * PITCH) / 2;
      const count = cols * rows;
      xs = new Float32Array(count);
      ys = new Float32Array(count);
      mask = new Float32Array(count);
      levels = new Uint8Array(count);
      order = new Uint32Array(count);
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const index = row * cols + col;
          const x = offsetX + col * PITCH;
          const y = offsetY + row * PITCH;
          xs[index] = x;
          ys[index] = y;
          const distance = Math.hypot((x - cx) / rx, (y - cy) / ry);
          const vignette =
            1 -
            smoothstep(
              0.22,
              1.05,
              Math.hypot((x - width * 0.5) / (width * 0.5), (y - height * 0.46) / (height * 0.52)),
            );
          const clear = 0.72 + 0.28 * smoothstep(0.2, 1.1, distance);
          mask[index] = vignette * clear;
        }
      }
      return { cx, cy };
    };

    let center = layout();

    const draw = (now: number) => {
      if (width < 2 || height < 2) center = layout();
      if (!started) started = now;
      const t = (now - started) / 1000;

      if (!reduced) {
        if (pulses.length === 0 && t < 0.1) {
          pulses.push({ x: center.cx, y: center.cy, born: t, strength: 1 });
          nextPulse = t + 0.25;
        }
        while (t >= nextPulse) {
          pulses.push({
            x: Math.random() * width,
            y: Math.random() * height,
            born: nextPulse,
            strength: 0.45 + Math.random() * 0.45,
          });
          nextPulse += 0.16 + Math.random() * 0.3;
        }
        for (let index = pulses.length - 1; index >= 0; index -= 1) {
          if (t - pulses[index].born > PULSE_LIFE) pulses.splice(index, 1);
        }
      }

      const live = pulses.map((pulse) => {
        const age = t - pulse.born;
        return {
          x: pulse.x,
          y: pulse.y,
          radius: age * PULSE_SPEED,
          gain: pulse.strength * Math.exp(-age * 1.15) * smoothstep(0, 0.08, age),
        };
      });

      const reach = PULSE_WIDTH * 3;
      starts.fill(0);
      for (let index = 0; index < xs.length; index += 1) {
        const m = mask[index] ?? 0;
        const x = xs[index] ?? 0;
        const y = ys[index] ?? 0;
        const drift = Math.sin(x * 0.018 - t * 2.1 + Math.sin(y * 0.011 + t * 0.6) * 1.6);
        const cross = Math.sin((x * 0.55 + y * 0.83) * 0.014 + t * 1.4);
        const crest = drift * 0.5 + 0.5;
        let spike = 0;
        for (const pulse of live) {
          const dx = x - pulse.x;
          const dy = y - pulse.y;
          if (Math.abs(dx) > pulse.radius + reach || Math.abs(dy) > pulse.radius + reach) continue;
          const offset = (Math.sqrt(dx * dx + dy * dy) - pulse.radius) / PULSE_WIDTH;
          if (offset > -3 && offset < 3) spike += pulse.gain * Math.exp(-offset * offset);
        }
        const crest3 = crest * crest * crest;
        const ridge = crest3 * crest3 * (0.55 + 0.45 * cross);
        const lift = Math.min(1, ridge * 0.9 + Math.min(1, spike));
        const alpha = (REST_ALPHA + (PEAK_ALPHA - REST_ALPHA) * lift) * m;
        const level =
          lift < 0.42 || alpha < 0.08
            ? 0
            : Math.min(LEVELS, Math.max(1, Math.round((alpha / PEAK_ALPHA) * LEVELS)));
        levels[index] = level;
        starts[level] += 1;
      }
      let cursor = 0;
      for (let level = 0; level <= LEVELS; level += 1) {
        const size = starts[level];
        starts[level] = cursor;
        cursor += size;
      }
      starts[LEVELS + 1] = cursor;
      fillAt.set(starts);
      for (let index = 0; index < levels.length; index += 1) {
        order[fillAt[levels[index]]++] = index;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const half = DOT / 2;
      for (let level = 1; level <= LEVELS; level += 1) {
        const sprite = sprites[level];
        if (!sprite) continue;
        ctx.globalAlpha = (level / LEVELS) * PEAK_ALPHA;
        for (let slot = starts[level]; slot < starts[level + 1]; slot += 1) {
          const index = order[slot] ?? 0;
          ctx.drawImage(sprite, (xs[index] ?? 0) - half, (ys[index] ?? 0) - half);
        }
      }
      ctx.globalAlpha = 1;

      if (!reduced) raf = requestAnimationFrame(draw);
    };

    const onResize = () => {
      center = layout();
      if (reduced) draw(performance.now());
    };

    if (width < 2 || height < 2) center = layout();
    draw(performance.now());
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [focusRef]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 size-full" />;
}

export function HomePreloader({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [line, setLine] = useState(welcome);
  const [leaving, setLeaving] = useState(false);
  const focusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const started = performance.now();
    let previous = started;
    let doneTimer = 0;
    let advanceTimer = 0;
    let armFrame = 0;
    let armed = false;
    let phase: "welcome" | "success" = "welcome";
    const timer = window.setInterval(() => {
      const now = performance.now();
      const gap = now - previous;
      previous = now;
      const elapsed = now - started;
      const next = Math.min(100, Math.round((elapsed / 2200) * 100));
      setProgress(next);
      const frame = Math.floor(elapsed / 18);
      if (phase === "welcome") {
        const locked = reduced || gap > 120 || frame >= 8;
        setLine(locked ? welcome : scramble(welcome, frame));
        if (locked && !armed && next >= (reduced ? 100 : 8) && (reduced || gap < 250)) {
          armed = true;
          armFrame = window.requestAnimationFrame(() => {
            armFrame = 0;
            advanceTimer = window.setTimeout(() => {
              phase = "success";
            }, reduced ? 0 : 1600);
          });
        }
        return;
      }
      const settle = Math.floor(Math.max(0, elapsed - 2200) / 18);
      const successLocked = reduced || gap > 120 || settle >= 8;
      setLine(successLocked ? success : scramble(success, settle));
      if (!successLocked || settle < success.length * 2 + 6) return;
      window.clearInterval(timer);
      setLeaving(true);
      doneTimer = window.setTimeout(onDone, reduced ? 200 : 780);
    }, 40);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(doneTimer);
      window.cancelAnimationFrame(armFrame);
      window.clearTimeout(advanceTimer);
      setLine(phase === "success" ? success : welcome);
    };
  }, [onDone]);

  return (
    <div
      data-home-preloader=""
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0b] text-foreground"
      style={{
        backgroundColor: "#0a0a0b",
        transform: leaving ? "translateY(-100%)" : "none",
        transition: "transform 0.8s ease",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(242,242,243,0.42) 0px, rgba(242,242,243,0.12) 1.15px, transparent 2.6px)",
          backgroundSize: "14px 14px",
          maskImage: "radial-gradient(ellipse at 50% 46%, #000 16%, transparent 72%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 46%, #000 16%, transparent 72%)",
        }}
      />
      <NeuralField focusRef={focusRef} />
      <p data-preloader-corner="" className="absolute top-5 right-5 font-mono text-[12px] text-quiet">
        {progress}%
      </p>
      <div ref={focusRef} className="relative flex flex-col items-center gap-4 px-6 text-center">
        <p className="font-mono text-[12px] text-ice">{progress}%</p>
        <p data-preloader-line="" className="font-sans text-2xl text-foreground sm:text-4xl">
          {progress >= 8 && progress < 100 ? welcome : line}
        </p>
      </div>
    </div>
  );
}
