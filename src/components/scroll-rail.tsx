"use client";

import { useEffect, useState } from "react";

export function ScrollRail() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const measure = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed top-0 right-0 z-40 h-dvh w-1.5 bg-white/10">
      <div className="w-full bg-ice" style={{ height: `${Math.max(6, progress * 100)}%` }} />
    </div>
  );
}
