"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { Corners, Live, Plate, Tag } from "@/components/about/hud";
import { StarField } from "@/components/about/star-field";
import { TypeOnScroll } from "@/components/about/type-on-scroll";
import { useReducedMotion } from "@/components/about/hooks";
import {
  awardGroups,
  awardsNote,
  faqNote,
  heroLine,
  heroNote,
  manifesto,
  method,
  mission,
  photos,
  questions,
  services,
} from "@/components/about/content";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { projectFields, projects } from "@/data/projects";
import { scrollEventName } from "@/components/smooth-scroll";
import { cn } from "@/lib/utils";

const display = "font-sans tracking-[-0.035em]";

function Hero() {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      setCount((value) => (value >= heroLine.length ? value : value + 1));
    }, 42);
    return () => window.clearInterval(id);
  }, [reduced]);
  const shown = reduced ? heroLine.length : count;

  return (
    <section className="relative -mt-14 flex min-h-dvh flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_36%,transparent_0%,rgba(10,10,11,0.5)_58%,#0a0a0b_100%)]"
      />
      <StarField />

      <div className="relative z-10 grid grid-cols-12 items-start gap-x-4 gap-y-6 px-4 pt-28 sm:px-8">
        <Tag tone="scan" className="col-span-12 sm:col-span-4">
          About // 01
        </Tag>
        <Plate
          src={photos.green}
          caption="Subject 01"
          code="Night shift"
          className="col-span-6 aspect-[4/5] sm:col-span-3 sm:col-start-5 lg:col-span-2"
        />
        <p className="col-span-12 max-w-sm font-sans text-base leading-snug text-foreground sm:col-span-4 sm:col-start-9 sm:text-lg lg:col-span-3 lg:col-start-10">
          {heroNote}
        </p>
      </div>

      <div className="relative z-10 mt-auto flex flex-col gap-6 px-4 pt-24 pb-32 sm:px-8 sm:pb-28">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          <Live>Night mode on</Live>
          <Tag>Sky 01 / Scroll to descend</Tag>
        </div>
        <div className="flex max-w-6xl flex-col gap-5">
          <h1 className={cn(display, "about-split text-5xl leading-[0.92] text-foreground sm:text-7xl lg:text-8xl")}>
            <span className="sr-only">{heroLine}</span>
            <span aria-hidden>
              {heroLine.slice(0, shown)}
              <span className="text-scan">{shown < heroLine.length ? "▍" : ""}</span>
            </span>
          </h1>
          <p className="max-w-xl font-sans text-lg leading-snug text-quiet sm:text-2xl">
            Identity, interfaces, and digital products.
          </p>
        </div>
      </div>
    </section>
  );
}

function Company() {

  const figures = [
    { value: String(services.length), label: "Services" },
    { value: String(projects.length), label: "Projects" },
    { value: String(projectFields.length), label: "Directions" },
    { value: "2026", label: "Studio year" },
  ];

  return (
    <section className="relative overflow-hidden px-4 py-32 sm:px-8 sm:py-48">
      <div className="relative grid grid-cols-12 gap-x-4 gap-y-16">
        <Tag tone="scan" className="col-span-12 sm:col-span-2">
          Agency
        </Tag>
        <p className={cn(display, "col-span-12 text-4xl leading-[1.05] text-foreground sm:col-span-10 sm:text-6xl")}>
          <TypeOnScroll text={manifesto} start={0.85} end={0.3} />
        </p>

        <Plate
          src={photos.choker}
          caption="Subject 02"
          code="Signal"
          className="col-span-7 aspect-[3/4] sm:col-span-4 lg:col-span-3 lg:col-start-3"
        />
        {[mission, method].map((block, index) => (
          <div
            key={block.label}
            className={cn(
              "col-span-12 flex flex-col gap-4 sm:col-span-6 lg:col-span-3",
              index === 0 ? "sm:self-end lg:col-start-6" : "sm:self-end lg:col-start-10",
            )}
          >
            <Tag tone="scan">
              {String(index + 1).padStart(2, "0")} / {block.label}
            </Tag>
            <p className="font-sans text-[15px] leading-relaxed text-foreground/90 sm:text-base">
              <TypeOnScroll text={block.text} start={0.95} end={0.6} />
            </p>
          </div>
        ))}
      </div>

      <div className="relative mt-24 grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
        {figures.map((item) => (
          <div key={item.label} className="bg-background px-4 py-8 sm:px-6 sm:py-10">
            <div>
              <p className={cn(display, "text-5xl text-foreground sm:text-7xl")}>{item.value}</p>
              <Tag className="mt-3">{item.label}</Tag>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ServiceCard({ name, note, index }: { name: string; note: string; index: number }) {
  return (
    <article
      data-service-card
      className="about-card group relative min-h-52 overflow-hidden bg-module transition-colors duration-300 hover:bg-[#17181c] sm:min-h-64"
    >
      <span aria-hidden className="about-noise pointer-events-none absolute inset-0 z-[5]" />
      <Corners className="m-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <button
        type="button"
        onClick={() => {
          window.dispatchEvent(new CustomEvent("uix-open-brief", { detail: { service: name } }));
        }}
        className="about-jitter relative z-10 flex h-full min-h-52 w-full cursor-pointer flex-col justify-between gap-6 p-3 text-left sm:min-h-64 sm:p-4"
      >
        <span className="flex items-center justify-between">
          <Tag tone="scan">{String(index + 1).padStart(2, "0")}</Tag>
          <span
            aria-hidden
            className="-translate-x-1 font-mono text-sm text-scan opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100"
          >
            →
          </span>
        </span>
        <span className="flex flex-col gap-2">
          <h3 className={cn(display, "about-split-live text-2xl leading-none text-foreground sm:text-3xl")}>{name}</h3>
          <span className="max-w-[26ch] font-sans text-[13px] leading-snug text-quiet transition-colors duration-300 group-hover:text-foreground">
            {note}
          </span>
        </span>
      </button>
    </article>
  );
}

function Services() {
  const grid = useRef<HTMLDivElement>(null);
  const section = useRef<HTMLElement>(null);
  const band = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const node = section.current;
    const veil = band.current;
    if (!mounted || !node || !veil) return;

    const measure = () => {
      const rect = node.getBoundingClientRect();
      const view = window.innerHeight || 1;
      const atBottom = rect.top < view - 16 && rect.bottom > view + 16;
      veil.style.opacity = atBottom ? "1" : "0";
      veil.style.visibility = atBottom ? "visible" : "hidden";
      veil.dataset.active = atBottom ? "true" : "false";
    };

    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener(scrollEventName, measure);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener(scrollEventName, measure);
      window.removeEventListener("resize", measure);
    };
  }, [mounted]);

  useLayoutEffect(() => {
    const node = grid.current;
    if (!node) return;
    const cards = gsap.utils.toArray<HTMLElement>("[data-service-card]", node);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      gsap.set(cards, { clearProps: "transform,opacity,clipPath" });
      return;
    }

    gsap.set(cards, { y: 52, scale: 0.92, opacity: 0, clipPath: "inset(34% 6% 34% 6%)" });

    let played = false;
    const play = () => {
      if (played) return;
      played = true;
      const tl = gsap.timeline();
      tl.to(cards, { y: 0, scale: 1, opacity: 1, duration: 0.62, stagger: 0.05, ease: "back.out(1.45)" }, 0);
      tl.to(cards, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.48, stagger: 0.05, ease: "power3.out" }, 0);
      tl.eventCallback("onComplete", () => {
        gsap.set(cards, { clearProps: "transform,clipPath,opacity" });
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) play();
      },
      { threshold: 0.18 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      gsap.killTweensOf(cards);
    };
  }, []);

  return (
    <section ref={section} className="px-4 py-32 sm:px-8 sm:py-48">
      <div className="grid grid-cols-12 items-end gap-x-4 gap-y-6">
        <h2 className={cn(display, "col-span-12 text-5xl text-foreground sm:col-span-6 sm:text-7xl")}>Services</h2>
        <p className="col-span-12 max-w-xs font-sans text-sm leading-snug text-quiet sm:col-span-4 sm:col-start-8">
          Twelve ways to work with the studio. Pick one, or stack a few. Click a card to start a brief.
        </p>
      </div>
      <div ref={grid} className="mt-10 grid grid-cols-2 gap-2 md:grid-cols-4">
        {services.map((item, index) => (
          <ServiceCard key={item.name} name={item.name} note={item.note} index={index} />
        ))}
      </div>
      {mounted
        ? createPortal(
            <div
              ref={band}
              data-active="false"
              aria-hidden
              className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-36 opacity-0"
              style={{
                backdropFilter: "blur(28px)",
                WebkitBackdropFilter: "blur(28px)",
                background:
                  "linear-gradient(to top, rgba(10,10,11,0.82) 0%, rgba(10,10,11,0.34) 42%, rgba(10,10,11,0) 100%)",
                maskImage: "linear-gradient(to top, #000 0%, #000 38%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(to top, #000 0%, #000 38%, transparent 100%)",
              }}
            />,
            document.body,
          )
        : null}
    </section>
  );
}

function projectTitles(platform: string) {
  return projects
    .filter((project) => project.platforms.some((item) => item === platform))
    .map((project) => project.title);
}

function titleForLine(titles: readonly string[], lineIndex: number, lineCount: number) {
  if (lineIndex < lineCount - 1) return titles[lineIndex];
  const rest = titles.slice(lineIndex);
  return rest.length > 0 ? rest.join(", ") : undefined;
}

function Awards() {
  const total = awardGroups.reduce(
    (sum, group) => sum + group.lines.reduce((inner, line) => inner + line.count, 0),
    0,
  );
  return (
    <section className="px-4 py-32 sm:px-8 sm:py-48">
      <div className="grid grid-cols-12 items-baseline gap-x-4 gap-y-4">
        <h2 className={cn(display, "col-span-9 text-5xl text-foreground sm:col-span-6 sm:text-7xl")}>Awards</h2>
        <p className={cn(display, "col-span-3 text-right text-3xl text-scan sm:col-span-2 sm:col-start-11 sm:text-5xl")}>
          ({total})
        </p>
        <p className="col-span-12 max-w-xs font-sans text-sm leading-snug text-quiet sm:col-span-4 sm:col-start-8 sm:row-start-2">
          {awardsNote}
        </p>
      </div>
      <div className="mt-16">
        {awardGroups.map((group) => (
          <div key={group.platform} className="border-t border-white/15">
            {group.lines.map((line, index) => {
              const work = titleForLine(projectTitles(group.platform), index, group.lines.length);
              return (
                <div
                  key={line.title}
                  className="grid items-baseline gap-4 py-4 transition-colors duration-200 hover:bg-white/[0.035] sm:grid-cols-12 sm:gap-8 sm:py-5"
                >
                  <p
                    className={`font-sans text-lg text-foreground sm:col-span-4 sm:text-xl ${index === 0 ? "" : "hidden sm:block"}`}
                  >
                    {index === 0 ? group.platform : " "}
                  </p>
                  <p className="font-mono text-base tabular-nums text-scan sm:col-span-1">x {line.count}</p>
                  <p className="font-sans text-lg text-foreground sm:col-span-3">{line.title}</p>
                  {work ? (
                    <p className="text-right font-sans text-lg text-quiet sm:col-span-4">{work}</p>
                  ) : (
                    <span className="hidden sm:col-span-4 sm:block" aria-hidden />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="px-4 py-32 sm:px-8 sm:py-48">
      <div className="grid items-start gap-16 lg:grid-cols-12 lg:gap-20">
        <div className="lg:sticky lg:top-24 lg:col-span-4">
          <h2 className={cn(display, "text-5xl text-foreground sm:text-7xl")}>FAQ</h2>
          <p className="mt-4 max-w-xs font-sans text-sm leading-snug text-quiet">{faqNote}</p>
        </div>
        <div className="lg:col-span-8">
          {questions.map((item, index) => {
            const shown = open === index;
            return (
              <article key={item.q} className="border-t border-white/15">
                <button
                  type="button"
                  aria-expanded={shown}
                  onClick={() => setOpen(shown ? null : index)}
                  className="group flex w-full cursor-pointer items-baseline gap-4 py-7 text-left sm:gap-8 sm:py-9"
                >
                  <Tag className="transition-colors group-hover:text-scan">{String(index + 1).padStart(2, "0")}</Tag>
                  <span
                    className={cn(
                      display,
                      "flex-1 text-2xl text-foreground transition-transform duration-300 ease-out group-hover:translate-x-1 sm:text-4xl",
                    )}
                  >
                    {item.q}
                  </span>
                  <span className="font-sans text-4xl leading-none text-scan">{shown ? "−" : "+"}</span>
                </button>
                <div
                  className={`grid ${reduced ? "" : "transition-[grid-template-rows] duration-300 ease-out"} ${shown ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                >
                  <div className="overflow-hidden">
                    <p className="max-w-xl pb-7 pl-8 font-sans text-[14px] leading-relaxed text-quiet sm:pb-9 sm:pl-12">
                      {item.a}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function AboutBoard() {
  return (
    <div className="page-scroll min-h-dvh overflow-x-clip bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <Company />
        <Services />
        <Awards />
        <Faq />
      </main>
      <SiteFooter />
    </div>
  );
}
