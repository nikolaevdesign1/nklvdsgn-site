"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export const scrollEventName = "nklv:scroll";

export function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;

    let outer = 0;
    let inner = 0;
    const arm = () => {
      const wait = 16000 + Math.random() * 20000;
      outer = window.setTimeout(() => {
        document.documentElement.classList.add("glitch");
        inner = window.setTimeout(() => {
          document.documentElement.classList.remove("glitch");
          arm();
        }, 280);
      }, wait);
    };
    arm();
    return () => {
      window.clearTimeout(outer);
      window.clearTimeout(inner);
      document.documentElement.classList.remove("glitch");
    };
  }, []);

  useEffect(() => {
    if (pathname === "/") return;

    let destroyed = false;
    let scroll: { destroy: () => void } | null = null;

    void import("locomotive-scroll").then(({ default: LocomotiveScroll }) => {
      if (destroyed) return;
      scroll = new LocomotiveScroll({
        lenisOptions: {
          lerp: 0.055,
          wheelMultiplier: 0.7,
          smoothWheel: true,
        },
        scrollCallback(values) {
          const position = values.scroll;
          if (typeof position !== "number") return;
          window.dispatchEvent(new CustomEvent(scrollEventName, { detail: { scroll: position } }));
        },
      });
    });

    return () => {
      destroyed = true;
      scroll?.destroy();
    };
  }, [pathname]);

  return null;
}
