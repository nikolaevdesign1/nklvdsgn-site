"use client";

import { useRef } from "react";
import { useReducedMotion, useScrollProgress } from "@/components/about/hooks";

/**
 * Types `text` out as its top edge travels up the screen. The untyped rest stays
 * in the flow as transparent text, so lines never reflow while it types.
 * `start` and `end` are fractions of the viewport height.
 */
export function TypeOnScroll({
  text,
  className,
  start = 0.92,
  end = 0.5,
}: {
  text: string;
  className?: string;
  start?: number;
  end?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const progress = useScrollProgress(ref, start, end);
  const shown = reduced ? text.length : Math.round(progress * text.length);
  const typing = !reduced && shown > 0 && shown < text.length;

  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {text.slice(0, shown)}
        <span className="relative inline-block w-0 align-baseline">
          <span className="absolute left-0 text-scan">{typing ? "▍" : ""}</span>
        </span>
        <span className="text-transparent">{text.slice(shown)}</span>
      </span>
    </span>
  );
}
