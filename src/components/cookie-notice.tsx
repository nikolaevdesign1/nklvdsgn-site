"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const KEY = "nklv.cookies";
const listeners = new Set<() => void>();
let cached: string | null | undefined;

function read() {
  try {
    const value = localStorage.getItem(KEY);
    if (value === cached) return cached;
    cached = value;
    return cached;
  } catch {
    return cached ?? null;
  }
}

function write(value: string) {
  localStorage.setItem(KEY, value);
  cached = value;
  listeners.forEach((listener) => listener());
}

function useCookieChoice() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    read,
    () => "server",
  );
}

export function useCookieNoticeOpen() {
  const choice = useCookieChoice();
  return choice !== "server" && !choice;
}

export function CookieNotice() {
  const pathname = usePathname();
  const visible = useCookieNoticeOpen();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!visible || !node) {
      document.documentElement.style.removeProperty("--cookie-block");
      return;
    }
    const measure = () => {
      const bottom = Number.parseFloat(getComputedStyle(node).bottom) || 0;
      document.documentElement.style.setProperty("--cookie-block", `${Math.ceil(node.offsetHeight + bottom + 16)}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--cookie-block");
    };
  }, [visible, pathname]);

  if (!visible) return null;

  const lift = pathname === "/works" || pathname === "/about" || pathname.startsWith("/works/");

  return (
    <div
      ref={ref}
      className={`popup-assemble fixed left-4 z-40 w-[min(22rem,calc(100vw-2rem))] border border-white/15 bg-background/95 p-3 ${lift ? "bottom-28" : "bottom-4"}`}
    >
      <div className="flex flex-col gap-3">
        <p className="font-sans text-[13px] text-quiet">
          This browser keeps the brief, the preview sign-in, and this choice.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-8 rounded-none border-white/15 bg-transparent px-3 font-mono text-[11px] text-foreground hover:bg-transparent hover:text-ice"
            onClick={() => write("declined")}
          >
            Decline
          </Button>
          <Button
            type="button"
            className="h-8 rounded-none bg-foreground px-3 font-mono text-[11px] text-background hover:bg-ice hover:text-background"
            onClick={() => write("accepted")}
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
