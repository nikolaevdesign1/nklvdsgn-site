"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "cn";

const ZONE = "America/Los_Angeles";
const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=34.0522&longitude=-118.2437&current=weather_code,is_day&timezone=America%2FLos_Angeles&forecast_days=1";

const clockFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONE,
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

type Weather = {
  code: number;
  day: boolean;
  label: string;
};

function weatherLabel(code: number) {
  if (code === 0) return "Clear";
  if (code === 1) return "Mostly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code === 85 || code === 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "Weather";
}

type Glyph = "sun" | "moon" | "cloud" | "partly" | "fog" | "rain" | "snow" | "storm";

function glyphFor(code: number, day: boolean): Glyph {
  if (code === 0 || code === 1) return day ? "sun" : "moon";
  if (code === 2) return day ? "partly" : "cloud";
  if (code === 3) return "cloud";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  return "cloud";
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function centerArtwork(art: SVGGElement) {
  const box = art.getBBox();
  if (!box.width || !box.height) return;
  const dx = 8 - (box.x + box.width / 2);
  const dy = 8 - (box.y + box.height / 2);
  art.setAttribute("transform", `translate(${dx.toFixed(3)} ${dy.toFixed(3)})`);
}

function WeatherGlyph({ code, day }: { code: number; day: boolean }) {
  const glyph = glyphFor(code, day);
  const artRef = useRef<SVGGElement>(null);

  useLayoutEffect(() => {
    const art = artRef.current;
    if (!art) return;
    centerArtwork(art);
    realignStudioRows();
  }, [glyph]);

  return (
    <svg viewBox="0 0 16 16" overflow="visible" className="block size-3.5 shrink-0" aria-hidden>
      <g ref={artRef} data-weather-art="">
      {glyph === "sun" ? (
        <>
          <circle cx="8" cy="8" r="2.2" {...stroke} />
          <path
            d="M8 1.8v1.6M8 12.6v1.6M1.8 8h1.6M12.6 8h1.6M3.5 3.5l1.1 1.1M11.4 11.4l1.1 1.1M12.5 3.5l-1.1 1.1M4.6 11.4l-1.1 1.1"
            {...stroke}
          />
        </>
      ) : null}
      {glyph === "moon" ? <path d="M9.4 2.2a4.3 4.3 0 1 0 4.1 6.6A3.4 3.4 0 1 1 9.4 2.2z" {...stroke} /> : null}
      {glyph === "cloud" ? (
        <path d="M4.1 12h6.7a2.2 2.2 0 0 0 .25-4.38A2.9 2.9 0 0 0 5.5 6.2a2 2 0 0 0-1.4 5.8z" {...stroke} />
      ) : null}
      {glyph === "partly" ? (
        <>
          <circle cx="11.3" cy="4.8" r="1.15" {...stroke} />
          <path d="M11.3 2.3v1M13.6 4.8h-1M12.9 3.2l-.7.7" {...stroke} />
          <path d="M3.8 12.2h6.4a2.05 2.05 0 0 0 .2-4.08A2.7 2.7 0 0 0 5.3 6.8a1.9 1.9 0 0 0-1.5 5.4z" {...stroke} />
        </>
      ) : null}
      {glyph === "fog" ? (
        <>
          <path d="M3.8 10.4h6.5a2 2 0 0 0 .2-3.98A2.6 2.6 0 0 0 5.4 5.2a1.8 1.8 0 0 0-1.6 5.2z" {...stroke} />
          <path d="M3.2 12.3h9.2M4.4 14.1h7" {...stroke} />
        </>
      ) : null}
      {glyph === "rain" ? (
        <>
          <path d="M4 9.5h6.6a2 2 0 0 0 .2-3.98A2.6 2.6 0 0 0 5.5 4.4 1.85 1.85 0 0 0 4 9.5z" {...stroke} />
          <path d="M6 11.2 5.3 12.8M8.4 11.2l-.7 1.6M10.6 11.2l-.7 1.6" {...stroke} />
        </>
      ) : null}
      {glyph === "snow" ? (
        <>
          <path d="M4 9.2h6.6a2 2 0 0 0 .2-3.98A2.6 2.6 0 0 0 5.5 4.1 1.85 1.85 0 0 0 4 9.2z" {...stroke} />
          <path d="M6.1 11.2v1.7M5.25 12.05h1.7M8.5 11.2v1.7M7.65 12.05h1.7M10.9 11.2v1.7M10.05 12.05h1.7" {...stroke} />
        </>
      ) : null}
      {glyph === "storm" ? (
        <>
          <path d="M3.8 9h6.8a2.05 2.05 0 0 0 .2-4.08A2.7 2.7 0 0 0 5.3 3.6a1.9 1.9 0 0 0-1.5 5.4z" {...stroke} />
          <path d="M8.7 9.2 7.1 12h2.1L7.7 14.6" {...stroke} />
        </>
      ) : null}
      </g>
    </svg>
  );
}

let weatherRequest: Promise<Weather | null> | null = null;
let weatherAt = 0;

function loadWeather() {
  if (weatherRequest && Date.now() - weatherAt < 30 * 60 * 1000) return weatherRequest;
  weatherAt = Date.now();
  weatherRequest = fetch(WEATHER_URL)
    .then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json() as Promise<{ current?: { weather_code?: number; is_day?: number } }>;
    })
    .then((data) => {
      const code = data.current?.weather_code;
      if (typeof code !== "number") return null;
      return { code, day: data.current?.is_day !== 0, label: weatherLabel(code) };
    })
    .catch(() => {
      weatherRequest = null;
      weatherAt = 0;
      return null;
    });
  return weatherRequest;
}

export function StudioClock({ tone = "light" }: { tone?: "light" | "dark" }) {
  const [now, setNow] = useState<Date | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadWeather().then((value) => {
      if (!cancelled) setWeather(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const label = now ? clockFormat.format(now) : "";

  return (
    <span
      data-studio-clock=""
      className={cn(
        "inline-flex flex-nowrap items-center gap-1.5",
        tone === "dark" ? "text-[#0a0a0b]/70" : "text-foreground/75",
      )}
    >
      <time
        className={cn(
          "font-mono text-[12px] leading-none whitespace-nowrap tabular-nums",
          !label && "invisible",
        )}
        aria-label={label ? `Los Angeles time ${label}` : "Los Angeles time"}
      >
        {label || "00:00:00 PM"}
      </time>
      {weather ? (
        <span className="inline-flex" title={`${weather.label} in Los Angeles`}>
          <WeatherGlyph code={weather.code} day={weather.day} />
          <span className="sr-only">{weather.label} in Los Angeles</span>
        </span>
      ) : null}
    </span>
  );
}

const studioRows = new Set<HTMLElement>();
let aligningRow = false;

function shiftOf(el: HTMLElement | SVGElement) {
  const match = /translateY\(([-\d.]+)px\)/.exec(el.style.transform);
  return match ? Number(match[1]) : 0;
}

function applyShift(el: HTMLElement | SVGElement, next: number) {
  const current = shiftOf(el);
  if (Math.abs(next - current) < 0.05) return;
  el.style.transform = `translateY(${next.toFixed(2)}px)`;
}

function elementText(el: HTMLElement) {
  return Array.from(el.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? "")
    .join("")
    .trim();
}

function inkMidFromBaseline(el: HTMLElement, text: string) {
  const cs = getComputedStyle(el);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  ctx.letterSpacing = cs.letterSpacing;
  const metrics = ctx.measureText(text);
  const ascent = metrics.actualBoundingBoxAscent;
  const descent = metrics.actualBoundingBoxDescent;
  if (!ascent && !descent) return null;
  return (descent - ascent) / 2;
}

function paintedMidY(el: HTMLElement) {
  const text = elementText(el);
  if (!text) return null;
  const mid = inkMidFromBaseline(el, text);
  if (mid == null) return null;
  const cs = getComputedStyle(el);
  const mirror = document.createElement("span");
  mirror.textContent = text;
  const probe = document.createElement("span");
  probe.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
  mirror.appendChild(probe);
  mirror.style.cssText = [
    "position:absolute",
    "left:0",
    "top:0",
    "visibility:hidden",
    "pointer-events:none",
    "margin:0",
    "white-space:nowrap",
    "display:block",
    `padding:${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
    `border-width:${cs.borderTopWidth} ${cs.borderRightWidth} ${cs.borderBottomWidth} ${cs.borderLeftWidth}`,
    "border-style:solid",
    "border-color:transparent",
    `font-family:${cs.fontFamily}`,
    `font-size:${cs.fontSize}`,
    `font-weight:${cs.fontWeight}`,
    `font-style:${cs.fontStyle}`,
    `letter-spacing:${cs.letterSpacing}`,
    `line-height:${cs.lineHeight}`,
    `font-variant-numeric:${cs.fontVariantNumeric}`,
  ].join(";");
  document.body.appendChild(mirror);
  const baseline = probe.getBoundingClientRect().bottom - mirror.getBoundingClientRect().top;
  mirror.remove();
  const rect = el.getBoundingClientRect();
  if (!rect.height) return null;
  return rect.top + baseline + mid;
}

function alignRow(row: HTMLElement) {
  if (aligningRow || !row.isConnected) return;
  const word = row.querySelector<HTMLElement>("[data-wordmark]");
  const time = row.querySelector<HTMLElement>("time");
  if (!word || !time) return;
  aligningRow = true;
  try {
    const wordMid = paintedMidY(word);
    const timeMid = paintedMidY(time);
    if (wordMid == null || timeMid == null) return;
    applyShift(time, shiftOf(time) + (wordMid - timeMid));
    const art = row.querySelector<SVGGraphicsElement>("[data-weather-art]");
    const svg = art?.ownerSVGElement;
    if (!art || !svg) return;
    const box = art.getBoundingClientRect();
    if (!box.height) return;
    applyShift(svg, shiftOf(svg) + (wordMid - (box.top + box.height / 2)));
  } finally {
    aligningRow = false;
  }
}

function realignStudioRows() {
  studioRows.forEach((row) => alignRow(row));
}

export function useStudioInkRow() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const row = ref.current;
    if (!row) return;
    studioRows.add(row);
    const align = () => alignRow(row);
    align();
    document.fonts?.ready.then(align);
    document.fonts?.addEventListener("loadingdone", align);
    const observer = new ResizeObserver(align);
    observer.observe(row);
    const mutations = new MutationObserver(align);
    mutations.observe(row, { childList: true, subtree: true });
    return () => {
      studioRows.delete(row);
      document.fonts?.removeEventListener("loadingdone", align);
      observer.disconnect();
      mutations.disconnect();
    };
  }, []);
  return ref;
}
