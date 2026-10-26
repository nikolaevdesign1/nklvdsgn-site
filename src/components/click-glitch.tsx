"use client";

import { useEffect } from "react";

export function ClickGlitch() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const hit = target.closest("button, a, [role='button']");
      if (!hit) return;
      hit.classList.add("glitch-hit");
      window.setTimeout(() => hit.classList.remove("glitch-hit"), 180);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
