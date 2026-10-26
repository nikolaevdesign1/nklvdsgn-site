"use client";

import { useEffect, useState, type RefObject } from "react";
import { scrollEventName } from "@/components/smooth-scroll";

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
  return reduced;
}

function onScroll(handler: () => void) {
  window.addEventListener("scroll", handler, { passive: true });
  window.addEventListener(scrollEventName, handler);
  window.addEventListener("resize", handler);
  return () => {
    window.removeEventListener("scroll", handler);
    window.removeEventListener(scrollEventName, handler);
    window.removeEventListener("resize", handler);
  };
}

/** Shifts every `[data-drift]` child of `ref` with the scroll position. */
export function useDrift(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const plates = [...node.querySelectorAll<HTMLElement>("[data-drift]")];
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const measure = () => {
      const current = ref.current;
      if (!current) return;
      const rect = current.getBoundingClientRect();
      const view = window.innerHeight || 1;
      const reduced = motion.matches;
      const travel = reduced ? 0.4 : Math.min(1, Math.max(0, (view - rect.top) / (view + rect.height)));
      for (const plate of plates) {
        const strength = Number(plate.dataset.drift || "1");
        const y = reduced ? 0 : (travel - 0.5) * 128 * strength;
        const x = reduced ? 0 : (travel - 0.5) * -72 * strength;
        const scale = 1.08 + (reduced ? 0.04 : travel * 0.22 * Math.min(Math.abs(strength), 1));
        plate.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
      }
    };

    measure();
    return onScroll(measure);
  }, [ref]);
}

/** 0 → 1 while the top of `ref` travels from `start` to `end` (fractions of the viewport height). */
export function useScrollProgress(ref: RefObject<HTMLElement | null>, start = 0.86, end = 0.28) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const measure = () => {
      const node = ref.current;
      if (!node) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setProgress(1);
        return;
      }
      const rect = node.getBoundingClientRect();
      const view = window.innerHeight || 1;
      const from = view * start;
      const to = view * end;
      setProgress(Math.min(1, Math.max(0, (from - rect.top) / (from - to))));
    };
    measure();
    return onScroll(measure);
  }, [ref, start, end]);

  return progress;
}
