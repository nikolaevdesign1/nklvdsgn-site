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
