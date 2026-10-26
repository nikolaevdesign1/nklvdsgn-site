"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BriefButton } from "@/components/brief-dialog";
import { DottedField } from "@/components/dotted-field";

const STUDIO_MAIL = "info@uixcorp.com";

function TypedMail() {
  const ref = useRef<HTMLAnchorElement>(null);
  const [count, setCount] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setArmed(true);
        observer.disconnect();
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced]);

  useEffect(() => {
    if (reduced || !armed || count >= STUDIO_MAIL.length) return;
    const id = window.setTimeout(() => setCount((value) => value + 1), 42);
    return () => window.clearTimeout(id);
  }, [armed, count, reduced]);

  const shown = reduced ? STUDIO_MAIL : STUDIO_MAIL.slice(0, count);

  return (
    <a
      ref={ref}
      href={`mailto:${STUDIO_MAIL}`}
      aria-label={STUDIO_MAIL}
      className="relative z-10 block w-full cursor-pointer px-4 font-sans text-[min(11vw,calc((100vw-2rem)/9))] leading-[0.9] tracking-tight whitespace-nowrap text-foreground sm:px-8 sm:text-[8vw]"
    >
      <span className="invisible" aria-hidden>
        {STUDIO_MAIL}
      </span>
      <span className="absolute top-0 left-0" aria-hidden>
        {shown}
      </span>
    </a>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative">
      <DottedField />
      <TypedMail />
      <div className="relative z-10 grid grid-cols-2 gap-10 px-4 pt-10 pb-28 sm:grid-cols-4 sm:px-8 sm:pt-16 sm:pb-48">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[11px] text-quiet">Pages</p>
          <Link href="/works" className="font-sans text-sm hover:text-ice">
            Works
          </Link>
          <Link href="/about" className="font-sans text-sm hover:text-ice">
            About
          </Link>
          <Link href="/contacts" className="font-sans text-sm hover:text-ice">
            Contact
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[11px] text-quiet">Studio</p>
          <Link href="/sign-in" className="font-sans text-sm hover:text-ice">
            Sign in
          </Link>
          <BriefButton
            label="Order a project"
            className="w-fit cursor-pointer font-sans text-sm text-foreground hover:text-ice"
          />
        </div>
        <p className="font-mono text-[11px] text-quiet sm:col-span-2 sm:text-right">© 2026 uixcorp.com</p>
      </div>
    </footer>
  );
}
