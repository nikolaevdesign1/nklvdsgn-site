"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { requestBrief } from "@/components/brief-dialog";
import { MascotCanvas, mascotStill } from "@/components/mascot-stage";
import { getMascotMood, pokeMascot, subscribeMascot, type MascotMood } from "@/lib/mascot-state";

const face =
  "radial-gradient(circle at 68% 78%, rgba(43,255,248,0.55) 0%, transparent 26%), radial-gradient(circle at 30% 26%, #ffffff 0%, #b0fcce 10%, #007342 42%, #060b0a 74%, #060b0a 100%)";

function FlatMark({ className }: { className?: string }) {
  const filterId = `niko-grain-${useId().replace(/:/g, "")}`;

  return (
    <span className={cn("relative block overflow-hidden", className)} style={{ borderRadius: "999px" }}>
      <span
        className="absolute inset-0"
        style={{
          borderRadius: "999px",
          background: face,
          boxShadow: "inset 0 0 8px rgba(6,11,10,0.65), 0 0 8px rgba(0,115,66,0.55)",
        }}
      />
      <svg className="absolute inset-0 size-full" aria-hidden>
        <filter id={filterId}>
          <feTurbulence type="fractalNoise" baseFrequency="1.15" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${filterId})`} opacity="0.55" />
      </svg>
      <span className="pointer-events-none absolute inset-0" style={{ borderRadius: "999px", mixBlendMode: "multiply", background: "rgba(6,11,10,0.28)" }} />
      <span className="niko-eye absolute top-[14.5px] left-[10.5px] z-10 h-1 w-[3px] bg-[#060b0a]" />
      <span className="niko-eye niko-eye-late absolute top-[14px] left-[23px] z-10 h-1 w-[3px] bg-[#060b0a]" />
    </span>
  );
}

export function NikoMark({
  className,
  mood,
  zoom = 1,
}: {
  className?: string;
  mood?: MascotMood;
  zoom?: number;
}) {
  const live = useSyncExternalStore(subscribeMascot, getMascotMood, () => "calm" as const);
  const shown = mood ?? live;
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    mascotStill(shown, zoom).then((url) => {
      if (!alive) return;
      if (url) {
        setSrc(url);
        setFailed(false);
      } else setFailed(true);
    });
    return () => {
      alive = false;
    };
  }, [shown, zoom]);

  if (failed) return <FlatMark className={className} />;

  return (
    <span
      aria-hidden
      className={cn("block bg-contain bg-center bg-no-repeat", className)}
      style={src ? { backgroundImage: `url("${src}")` } : undefined}
    />
  );
}

export function ContactMascot() {
  const [flat, setFlat] = useState(false);
  const mood = useSyncExternalStore(subscribeMascot, getMascotMood, () => "calm" as const);

  return (
    <div
      aria-hidden
      data-mascot-mood={mood}
      className="pointer-events-none aspect-[3/4] w-[min(100%,78vw,560px)] overflow-visible lg:w-[min(100%,58vh,640px)]"
    >
      {flat ? <FlatMark className="size-full" /> : <MascotCanvas layout="stage" onFail={() => setFlat(true)} />}
    </div>
  );
}

export function NikoFace() {
  const pathname = usePathname();
  const [flat, setFlat] = useState(false);
  const mood = useSyncExternalStore(subscribeMascot, getMascotMood, () => "calm" as const);

  if (pathname === "/contacts") return null;

  return (
    <button
      type="button"
      data-mascot-mood={mood}
      aria-label="Brief with Friend"
      onClick={() => {
        pokeMascot();
        requestBrief();
      }}
      className="mascot-dock z-40 size-[92px] sm:size-[118px]"
    >
      {flat ? <FlatMark className="size-full" /> : <MascotCanvas onFail={() => setFlat(true)} />}
    </button>
  );
}
