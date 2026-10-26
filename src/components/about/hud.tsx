import { cn } from "@/lib/utils";

/** Four L-shaped marks in the corners of a positioned parent. */
export function Corners({ className }: { className?: string }) {
  const mark = "absolute size-2.5 border-scan/70";
  return (
    <span aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      <span className={cn(mark, "top-0 left-0 border-t border-l")} />
      <span className={cn(mark, "top-0 right-0 border-t border-r")} />
      <span className={cn(mark, "bottom-0 left-0 border-b border-l")} />
      <span className={cn(mark, "right-0 bottom-0 border-r border-b")} />
    </span>
  );
}

/** Small mono label in the HUD voice. */
export function Tag({
  children,
  tone = "quiet",
  className,
}: {
  children: React.ReactNode;
  tone?: "quiet" | "scan" | "signal" | "foreground";
  className?: string;
}) {
  const color = {
    quiet: "text-quiet",
    scan: "text-scan",
    signal: "text-signal",
    foreground: "text-foreground",
  }[tone];
  return (
    <p className={cn("font-mono text-[10px] uppercase tracking-[0.14em] sm:text-[11px]", color, className)}>
      {children}
    </p>
  );
}

/** Live indicator: a blinking square and a label. */
export function Live({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className="about-blink size-1.5 bg-signal" />
      <Tag tone="foreground">{children}</Tag>
    </span>
  );
}

/** A photo with scanlines, corner marks, and a mono caption. */
export function Plate({
  src,
  caption,
  code,
  className,
  imageClassName,
}: {
  src: string;
  caption: string;
  code: string;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <figure className={cn("about-plate group relative overflow-hidden bg-module", className)}>
      <img
        src={src}
        alt=""
        loading="lazy"
        className={cn(
          "size-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]",
          imageClassName,
        )}
      />
      <span aria-hidden className="about-scanlines pointer-events-none absolute inset-0" />
      <Corners className="m-2" />
      <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-ink/85 to-transparent p-3 pt-10">
        <Tag tone="foreground">{caption}</Tag>
        <Tag tone="scan">{code}</Tag>
      </figcaption>
    </figure>
  );
}

/** Thin dashed orbits with one satellite. Pure graphics, sits behind content. */
export function Orbit({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 200 200" className={cn("pointer-events-none text-scan", className)} fill="none">
      <g stroke="currentColor" strokeWidth="0.3">
        <circle cx="100" cy="100" r="98" strokeDasharray="0.6 2.4" opacity="0.7" />
        <circle cx="100" cy="100" r="74" opacity="0.35" />
        <circle cx="100" cy="100" r="50" strokeDasharray="4 3" opacity="0.5" />
        <path d="M100 0v200M0 100h200" opacity="0.25" />
      </g>
      <g className="about-orbit" style={{ transformOrigin: "100px 100px" }}>
        <rect x="171" y="97" width="6" height="6" fill="currentColor" />
        <circle cx="174" cy="100" r="6" stroke="currentColor" strokeWidth="0.4" />
      </g>
    </svg>
  );
}

/** Vertical ruler with ticks and a label, for the edge of a section. */
export function Ruler({ label, className }: { label: string; className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none flex items-stretch gap-2", className)}>
      <span className="about-ticks w-2" />
      <Tag className="[writing-mode:vertical-rl]">{label}</Tag>
    </div>
  );
}

/** Registration cross. */
export function Cross({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("pointer-events-none absolute size-3 text-scan/60", className)}>
      <span className="absolute top-1/2 left-0 h-px w-full bg-current" />
      <span className="absolute top-0 left-1/2 h-full w-px bg-current" />
    </span>
  );
}

/** Endless mono line. Decorative. */
export function Ticker({ items, className }: { items: readonly string[]; className?: string }) {
  const line = items.join("   //   ");
  return (
    <div aria-hidden className={cn("pointer-events-none overflow-hidden border-y border-white/10 py-2", className)}>
      <div className="about-ticker flex w-max whitespace-nowrap">
        {[0, 1].map((n) => (
          <Tag key={n} className="pr-12">
            {`${line}   //   `}
          </Tag>
        ))}
      </div>
    </div>
  );
}

/** Section header mark: index, rule, label. */
export function SectionMark({ index, label }: { index: string; label: string }) {
  return (
    <div aria-hidden className="mb-10 flex items-center gap-4">
      <Tag tone="scan">[{index}]</Tag>
      <span className="h-px flex-1 bg-white/15" />
      <Tag>{label}</Tag>
    </div>
  );
}
