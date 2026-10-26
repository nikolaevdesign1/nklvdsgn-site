"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BriefDialog } from "@/components/brief-dialog";
import { ScrambleText } from "@/components/scramble-text";
import { socials } from "@/components/social-links";
import { StudioClock, useStudioInkRow } from "@/components/studio-clock";
import { scrollEventName } from "@/components/smooth-scroll";
import { cn } from "cn";

const nav = [
  { href: "/works", label: "WORKS" },
  { href: "/about", label: "ABOUT" },
  { href: "/contacts", label: "CONTACTS" },
] as const;

const capTrim = "block leading-none [text-box:trim-both_cap_alphabetic]";
const rowClass = "relative z-30 flex items-center justify-between gap-4 px-4 pt-3 pb-3 transition-opacity duration-200 sm:gap-8 sm:px-8";
const logoClass =
  "block shrink-0 font-sans text-[18px] leading-none tracking-tight whitespace-nowrap transition-colors duration-200 sm:text-[22px]";

function readScroll() {
  return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

function Burger({ open, solid }: { open: boolean; solid: boolean }) {
  const bar = solid ? "bg-[#0a0a0b]" : "bg-foreground";
  return (
    <span className="relative block h-3.5 w-5" aria-hidden>
      <span className={cn("absolute left-0 h-px w-5 transition duration-300", bar, open ? "top-1.5 rotate-45" : "top-0")} />
      <span className={cn("absolute top-1.5 left-0 h-px w-5 transition duration-300", bar, open && "opacity-0")} />
      <span className={cn("absolute left-0 h-px w-5 transition duration-300", bar, open ? "top-1.5 -rotate-45" : "top-3")} />
    </span>
  );
}

function HeaderRow({
  ghost = false,
  solid = false,
  open = false,
  concealed = false,
  onToggle,
}: {
  ghost?: boolean;
  solid?: boolean;
  open?: boolean;
  concealed?: boolean;
  onToggle?: () => void;
}) {
  const pathname = usePathname();
  const clusterRef = useStudioInkRow();
  const ink = solid ? "text-[#0a0a0b] hover:text-[#0a0a0b]/60" : "text-foreground hover:text-ice";
  const itemClass = cn("font-mono text-[12px] transition-colors duration-200", ink);

  return (
    <div className={cn(rowClass, ghost && "invisible", concealed && "pointer-events-none opacity-0")} aria-hidden={ghost || concealed || undefined}>
      <div ref={clusterRef} className="clock-cluster flex min-w-0 flex-nowrap items-center gap-2.5 sm:gap-3">
        {ghost ? (
          <span className={cn(logoClass, "text-foreground")}>uixcorp.com</span>
        ) : (
          <Link
            href="/"
            onClick={() => {
              if (open) onToggle?.();
            }}
            data-wordmark=""
            className={cn(logoClass, ink)}
          >
            uixcorp.com
          </Link>
        )}
        {ghost ? null : <StudioClock tone={solid ? "dark" : "light"} />}
      </div>
      <nav className="hidden min-w-0 flex-wrap items-center justify-end gap-x-4 gap-y-2 sm:gap-x-6 min-[1100px]:gap-x-8 lg:flex" aria-label={ghost ? undefined : "Pages"}>
        {nav.map((item) =>
          ghost ? (
            <span key={item.href} className={cn(itemClass, capTrim)}>
              {item.label}
            </span>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={cn(itemClass, capTrim, pathname === item.href && !solid && "text-ice")}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              <ScrambleText text={item.label} />
            </Link>
          ),
        )}
        {ghost ? (
          <span className={cn(itemClass, capTrim)}>BRIEF WITH FRIEND</span>
        ) : (
          <BriefDialog label="BRIEF WITH FRIEND" triggerClassName={cn(capTrim, "border-0", ink)} />
        )}
        {ghost ? (
          <span className={cn(itemClass, capTrim)}>SIGN IN</span>
        ) : (
          <Link href="/sign-in" className={cn(itemClass, capTrim, pathname === "/sign-in" && !solid && "text-ice")}>
            <ScrambleText text="SIGN IN" />
          </Link>
        )}
      </nav>
      {ghost ? (
        <span className="inline-flex size-8 shrink-0 lg:hidden" />
      ) : (
        <button
          type="button"
          className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-end bg-transparent lg:hidden"
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={onToggle}
        >
          <Burger open={open} solid={solid} />
        </button>
      )}
    </div>
  );
}

function MobileMenu({
  open,
  solid,
  onClose,
}: {
  open: boolean;
  solid: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const ink = solid ? "text-[#0a0a0b] hover:text-[#0a0a0b]/60" : "text-foreground hover:text-ice";
  const itemClass = cn("font-mono text-[22px] leading-none py-3 transition-colors duration-200", ink);
  const rule = solid ? "border-[#0a0a0b]/15" : "border-white/15";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const panel = (
    <div
      id="site-menu"
      inert={open ? undefined : true}
      className={cn(
        "fixed top-14 left-0 z-[60] h-[calc(100dvh-3.5rem)] w-screen overflow-y-auto overscroll-contain px-6 pt-2 pb-10 transition-[opacity,translate] duration-300 ease-out lg:hidden",
        solid ? "bg-white" : "bg-[#0a0a0b]",
        open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0 [&_*]:pointer-events-none",
      )}
    >
      <nav className="flex flex-col" aria-label="Pages">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={cn(itemClass, pathname === item.href && !solid && "text-ice")}
            aria-current={pathname === item.href ? "page" : undefined}
          >
            <ScrambleText text={item.label} />
          </Link>
        ))}
        <span className="inline-flex" onClick={onClose}>
          <BriefDialog
            label="BRIEF WITH FRIEND"
            triggerClassName={cn("h-auto justify-start border-0 px-0 py-3 text-[22px] leading-none", ink)}
          />
        </span>
        <Link href="/sign-in" onClick={onClose} className={cn(itemClass, pathname === "/sign-in" && !solid && "text-ice")}>
          <ScrambleText text="SIGN IN" />
        </Link>
        <div className={cn("mt-3 flex flex-col border-t pt-3", rule)}>
          {socials.map((item) => (
            <a key={item.href} href={item.href} target="_blank" rel="noreferrer" onClick={onClose} className={itemClass}>
              <ScrambleText text={item.label} />
            </a>
          ))}
        </div>
      </nav>
    </div>
  );

  if (!mounted) return panel;
  return createPortal(panel, document.body);
}

function ScrollPlaque({ shown }: { shown: boolean }) {
  const clusterRef = useStudioInkRow();
  const link =
    "font-mono text-[11px] uppercase text-[#0a0a0b] transition-colors duration-200 hover:text-[#0a0a0b]/55 sm:text-[12px]";
  return (
    <aside
      aria-hidden={shown ? undefined : true}
      className={cn(
        "fixed top-3 right-3 z-40 w-[min(16.25rem,64vw)] bg-[#f4f4f5] px-3 py-2.5 text-[#0a0a0b] transition-transform duration-300 ease-out sm:top-4 sm:right-6 sm:w-[min(17.5rem,72vw)] sm:px-4 sm:py-4",
        shown ? "pointer-events-auto" : "pointer-events-none",
      )}
      style={{ transform: shown ? "translateX(0)" : "translateX(120%)" }}
    >
      <div ref={clusterRef} className="plaque-cluster flex flex-nowrap items-center gap-x-2 sm:gap-x-3">
        <p data-wordmark="" className="font-sans text-[15px] leading-none whitespace-nowrap sm:text-lg">
          uixcorp.com
        </p>
        <StudioClock tone="dark" />
      </div>
      <p className="mt-0.5 font-mono text-[10px] uppercase sm:mt-1 sm:text-[11px]">by Oleg Nikolaev</p>
      <nav className="mt-2.5 flex flex-col gap-1 sm:mt-5 sm:gap-2" aria-label="Pages">
        <Link href="/works" className={link}>
          <ScrambleText text="Works" />
        </Link>
        <Link href="/about" className={link}>
          <ScrambleText text="About" />
        </Link>
        <Link href="/contacts" className={link}>
          <ScrambleText text="Contacts" />
        </Link>
        <BriefDialog
          label="Brief with Friend"
          triggerClassName="h-auto justify-start border-0 px-0 font-mono text-[11px] uppercase text-[#0a0a0b] transition-colors duration-200 hover:bg-transparent hover:text-[#0a0a0b]/55 sm:text-[12px]"
        />
        <Link href="/sign-in" className={link}>
          <ScrambleText text="Sign in" />
        </Link>
      </nav>
      <div className="mt-2.5 border-t border-[#0a0a0b]/15 pt-2 sm:mt-4 sm:pt-3">
        <p className="font-sans text-[12px] leading-snug sm:text-[13px]">Identity, interfaces, and digital products.</p>
        <Link
          href="/contacts"
          className="mt-2 inline-flex cursor-pointer items-center bg-[#0a0a0b] px-2.5 py-1.5 font-mono text-[11px] text-white uppercase transition-colors duration-200 hover:bg-[#0a0a0b]/80 sm:mt-3 sm:px-3 sm:py-2 sm:text-[12px]"
        >
          <ScrambleText text="Leave a request" />
        </Link>
        <a href="mailto:info@uixcorp.com" className={cn(link, "mt-1 block normal-case sm:mt-2")}>
          info@uixcorp.com
        </a>
      </div>
    </aside>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const apply = (y: number) => {
      const next = y > 8;
      setSolid((current) => (current === next ? current : next));
    };

    const onWindow = () => apply(readScroll());
    const onSmooth = (event: Event) => {
      const detail = (event as CustomEvent<{ scroll?: number }>).detail;
      if (typeof detail?.scroll === "number") apply(detail.scroll);
    };

    const frame = window.requestAnimationFrame(onWindow);
    window.addEventListener("scroll", onWindow, { passive: true });
    window.addEventListener(scrollEventName, onSmooth);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onWindow);
      window.removeEventListener(scrollEventName, onSmooth);
    };
  }, [pathname]);

  const offFirst = solid;
  const concealed = offFirst && !open;

  return (
    <>
      <header
        data-header-solid={offFirst ? "true" : "false"}
        className={cn(
          "fixed inset-x-0 top-0 z-30 transition-[colors,opacity] duration-200",
          concealed && "pointer-events-none opacity-0",
          open ? "bg-[#0a0a0b]" : "bg-transparent",
        )}
      >
        <HeaderRow
          solid={false}
          open={open}
          concealed={concealed}
          onToggle={() => setOpen((value) => !value)}
        />
        <MobileMenu open={open} solid={false} onClose={() => setOpen(false)} />
      </header>
      <ScrollPlaque shown={offFirst && !open} />
      <div className="pointer-events-none">
        <HeaderRow ghost />
      </div>
    </>
  );
}
