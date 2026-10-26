"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { projectFields, projects } from "@/data/projects";
import { scrollEventName } from "@/components/smooth-scroll";

const heroLine = "uixcorp.com is a design studio.";
const company =
  "Identity, interfaces, and digital products. A biography has not been written.";

const services = [
  "Brand identity",
  "Art direction",
  "Naming",
  "Website design",
  "Interface design",
  "Mobile apps",
  "Social media",
  "Motion",
  "Strategy",
  "Copywriting",
  "Frontend",
  "Product",
] as const;

const frames = [
  "/placeholders/case/still.avif",
  "/placeholders/case/grid-1.avif",
  "/placeholders/case/full-1.avif",
  "/placeholders/case/grid-2.avif",
  "/placeholders/case/intro-1.avif",
  "/placeholders/case/full-2.avif",
] as const;

const awardGroups = [
  {
    platform: "Behance",
    lines: [
      { title: "Site of the Month", count: 2 },
      { title: "Honorable Mention", count: 3 },
    ],
  },
  {
    platform: "Awwwards",
    lines: [
      { title: "Site of the Day", count: 4 },
      { title: "Honorable Mention", count: 2 },
    ],
  },
  {
    platform: "CSS Design Awards",
    lines: [
      { title: "Site of the Day", count: 2 },
      { title: "Site of the Month", count: 1 },
      { title: "Honorable Mention", count: 3 },
    ],
  },
] as const;

const questions = [
  {
    q: "How do I start?",
    a: "Open Brief with Friend or the contact page. Consultation is free. We can talk through what you want.",
  },
  {
    q: "What does Friend do?",
    a: "Friend is the brief in this browser. It can guide you around the site, help you figure out where to start, and price a project or design support from the studio calculator. The figure is approximate and stays in this browser.",
  },
  {
    q: "What does the studio design?",
    a: "Identity, interfaces, and digital products. The studio list covers brand identity, art direction, websites, interface design, mobile apps, motion, strategy, and frontend.",
  },
  {
    q: "How long does a project take?",
    a: "There is no fixed schedule on this site. Timing comes out of the brief, and a call is the place to talk it through.",
  },
  {
    q: "How do I reach the studio?",
    a: "Open Contacts. The brief is on that page, and the studio inbox is info@uixcorp.com.",
  },
] as const;

const cold =
  "grayscale contrast-125 brightness-75 saturate-50 hue-rotate-[190deg]";
const plateTone = "grayscale contrast-110 brightness-[0.38] saturate-0";

function useReducedMotion() {
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

function useDrift(ref: RefObject<HTMLElement | null>) {
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
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener(scrollEventName, measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener(scrollEventName, measure);
    };
  }, [ref]);
}

function DotField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let width = 0;
    let height = 0;

    const draw = (now: number) => {
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (bounds.width !== width || bounds.height !== height) {
        width = bounds.width;
        height = bounds.height;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const t = reduced ? 0 : now / 1000;
      const pitch = 8;
      ctx.fillStyle = "#f2f2f3";
      for (let y = pitch; y < height; y += pitch) {
        const wave = Math.sin(y * 0.02 + t * 0.8) * 28 + Math.sin(t * 0.35) * 12;
        for (let x = pitch; x < width; x += pitch) {
          const dome = Math.hypot((x - width * 0.5) / (width * 0.46), (y - height * 0.72) / (height * 0.42));
          const ridge = Math.sin(x * 0.02 + y * 0.01 + t * 1.1 + wave * 0.02);
          const alpha = dome < 1 ? 0.15 + (1 - dome) * 0.55 * (0.45 + ridge * 0.55) : 0.04 + Math.max(0, ridge) * 0.08;
          if (alpha < 0.08) continue;
          ctx.globalAlpha = alpha;
          ctx.fillRect(x, y + wave * (1 - Math.min(dome, 1)) * 0.15, 1.4, 1.4);
        }
      }
      ctx.globalAlpha = 1;
      if (!reduced) raf = requestAnimationFrame(draw);
    };

    draw(performance.now());
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 size-full" />;
}

function Hero() {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (reduced) {
      setCount(heroLine.length);
      return;
    }
    const id = window.setInterval(() => {
      setCount((value) => (value >= heroLine.length ? value : value + 1));
    }, 42);
    return () => window.clearInterval(id);
  }, [reduced]);

  const pops = [
    { src: frames[0], className: "top-[16%] left-[7%] w-[28%] sm:w-[18%] [animation-delay:-1s]" },
    { src: frames[1], className: "top-[22%] right-[8%] w-[34%] sm:w-[16%] [animation-delay:-4.2s]" },
    { src: frames[2], className: "bottom-[18%] left-[18%] w-[30%] sm:w-[20%] [animation-delay:-7s]" },
    { src: frames[4], className: "right-[14%] bottom-[12%] w-[26%] sm:w-[14%] [animation-delay:-2.4s]" },
  ];

  return (
    <section className="relative -mt-14 flex min-h-dvh flex-col justify-end overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 70% 20%, rgba(184,212,255,0.28), transparent 42%), radial-gradient(ellipse at 20% 80%, rgba(242,242,243,0.08), transparent 46%)",
        }}
      />
      <DotField />
      {pops.map((pop) => (
        <img
          key={pop.src}
          src={pop.src}
          alt=""
          className={`about-pop pointer-events-none absolute aspect-[4/5] object-cover ${cold} ${pop.className}`}
        />
      ))}
      <div className="relative z-10 flex flex-col gap-6 px-4 pt-28 pb-32 sm:px-8 sm:pb-28">
        <p className="font-mono text-[11px] text-ice">About</p>
        <div className="flex max-w-5xl flex-col gap-4">
          <h1 className="font-sans text-5xl leading-[0.92] text-foreground sm:text-7xl lg:text-8xl">
            {heroLine.slice(0, count)}
            <span className="text-ice" aria-hidden>
              {count < heroLine.length ? "▍" : ""}
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
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(0);
  const words = company.split(" ");
  useDrift(ref);

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
      const start = view * 0.86;
      const end = view * 0.28;
      const next = (start - rect.top) / (start - end);
      setProgress(Math.min(1, Math.max(0, next)));
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener(scrollEventName, measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener(scrollEventName, measure);
    };
  }, []);

  const figures = [
    { value: String(services.length), label: "Services", src: "/placeholders/ponder-ai.avif", drift: "0.5" },
    { value: String(projects.length), label: "Projects", src: "/placeholders/frequency.avif", drift: "-0.4" },
    { value: String(projectFields.length), label: "Directions", src: "/placeholders/hungry-tiger.avif", drift: "0.62" },
    { value: "2026", label: "Studio year", src: "/placeholders/cantor8.avif", drift: "-0.55" },
  ];

  return (
    <section ref={ref} className="relative overflow-hidden px-4 py-32 sm:px-8 sm:py-48">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <img
          data-drift="1"
          src="/placeholders/monolith.avif"
          alt=""
          className={`absolute top-[-16%] left-[-12%] h-[88%] w-[66%] max-w-none object-cover opacity-80 ${plateTone}`}
        />
        <img
          data-drift="-0.72"
          src="/placeholders/goom-gum.avif"
          alt=""
          className={`absolute right-[-14%] bottom-[-18%] h-[74%] w-[52%] max-w-none object-cover opacity-70 ${plateTone}`}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(10,10,11,0.82)_0%,rgba(10,10,11,0.62)_48%,rgba(10,10,11,0.4)_100%)]" />
      </div>
      <p className="relative max-w-6xl font-sans text-4xl leading-[1.05] sm:text-6xl lg:text-7xl">
        {words.map((word, index) => {
          const on = reduced || progress >= index / words.length;
          return (
            <span key={`${word}-${index}`} className={on ? "text-foreground" : "text-white/25"}>
              {word}
              {index < words.length - 1 ? " " : ""}
            </span>
          );
        })}
      </p>
      <div className="relative mt-16 grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
        {figures.map((item) => (
          <div key={item.label} className="relative overflow-hidden bg-background px-4 py-8 sm:px-6 sm:py-10">
            <img
              data-drift={item.drift}
              src={item.src}
              alt=""
              className={`pointer-events-none absolute inset-[-22%] size-[144%] max-w-none object-cover opacity-90 ${plateTone}`}
            />
            <div className="absolute inset-0 bg-[#0a0a0b]/72" />
            <div className="relative">
              <p className="font-sans text-5xl text-foreground sm:text-7xl">{item.value}</p>
              <p className="mt-3 font-mono text-[11px] text-quiet">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ServiceCard({ name, index }: { name: string; index: number }) {
  const root = useRef<HTMLElement>(null);
  const photo = useRef<HTMLImageElement>(null);
  const reduced = useReducedMotion();
  const frame = frames[index % frames.length];

  useEffect(() => {
    const node = root.current;
    const image = photo.current;
    if (!node || !image) return;
    gsap.set(image, { opacity: 0, yPercent: 10, scale: 0.97 });
    const show = () => {
      if (reduced) {
        gsap.set(image, { opacity: 1, yPercent: 0, scale: 1 });
        return;
      }
      gsap.to(image, { opacity: 1, yPercent: 0, scale: 1.03, duration: 0.42, ease: "power3.out" });
    };
    const hide = () => {
      if (reduced) {
        gsap.set(image, { opacity: 0, yPercent: 0, scale: 1 });
        return;
      }
      gsap.to(image, { opacity: 0, yPercent: 8, scale: 0.98, duration: 0.32, ease: "power2.out" });
    };
    node.addEventListener("pointerenter", show);
    node.addEventListener("pointerleave", hide);
    return () => {
      node.removeEventListener("pointerenter", show);
      node.removeEventListener("pointerleave", hide);
      gsap.killTweensOf(image);
    };
  }, [reduced]);

  return (
    <article ref={root} data-service-card className="relative min-h-44 overflow-hidden bg-[#121214] sm:min-h-56">
      <div data-service-wash className="pointer-events-none absolute inset-0 opacity-0">
        <img src={frame} alt="" className={`size-full object-cover ${cold}`} />
      </div>
      <img ref={photo} src={frame} alt="" className="pointer-events-none absolute inset-0 z-[1] size-full object-cover" />
      <button
        type="button"
        onClick={() => {
          window.dispatchEvent(new CustomEvent("uix-open-brief", { detail: { service: name } }));
        }}
        className="relative z-10 flex h-full min-h-44 w-full cursor-pointer flex-col justify-between p-3 text-left sm:min-h-56 sm:p-4"
      >
        <p className="font-mono text-[11px] text-ice">{String(index + 1).padStart(2, "0")}</p>
        <h3 className="font-sans text-2xl leading-none text-foreground sm:text-3xl">{name}</h3>
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
    const washes = gsap.utils.toArray<HTMLElement>("[data-service-wash]", node);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      gsap.set(washes, { opacity: 0 });
      gsap.set(cards, { clearProps: "transform,opacity,clipPath" });
      return;
    }

    gsap.set(cards, { y: 52, scale: 0.92, opacity: 0, clipPath: "inset(34% 6% 34% 6%)" });
    gsap.set(washes, { yPercent: 110, opacity: 1 });

    let played = false;
    const play = () => {
      if (played) return;
      played = true;
      const tl = gsap.timeline();
      tl.to(
        cards,
        {
          y: 0,
          scale: 1,
          opacity: 1,
          duration: 0.62,
          stagger: 0.05,
          ease: "back.out(1.45)",
        },
        0,
      );
      tl.to(
        cards,
        {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 0.48,
          stagger: 0.05,
          ease: "power3.out",
        },
        0,
      );
      tl.to(
        washes,
        {
          yPercent: 0,
          duration: 0.44,
          stagger: 0.05,
          ease: "power3.out",
        },
        0.06,
      );
      tl.to(
        washes,
        {
          opacity: 0,
          duration: 0.22,
          stagger: 0.05,
          ease: "power1.out",
        },
        0.4,
      );
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
      gsap.killTweensOf([...cards, ...washes]);
    };
  }, []);

  return (
    <section ref={section} className="px-4 py-32 sm:px-8 sm:py-48">
      <div className="flex items-end justify-between gap-6">
        <h2 className="font-sans text-5xl text-foreground sm:text-7xl">Services</h2>
        <p className="font-mono text-[11px] text-quiet">{String(services.length).padStart(2, "0")}</p>
      </div>
      <div ref={grid} className="mt-10 grid grid-cols-2 gap-2 md:grid-cols-4">
        {services.map((name, index) => (
          <ServiceCard key={name} name={name} index={index} />
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
      <div className="flex items-baseline justify-between gap-6">
        <h2 className="font-sans text-5xl text-foreground sm:text-7xl">Awards</h2>
        <p className="font-sans text-3xl text-foreground sm:text-5xl">({total})</p>
      </div>
      <div className="mt-16">
        {awardGroups.map((group) => (
          <div key={group.platform} className="border-t border-white/15">
            {group.lines.map((line, index) => {
              const work = titleForLine(projectTitles(group.platform), index, group.lines.length);
              return (
                <div
                  key={line.title}
                  className="grid items-baseline gap-4 py-4 sm:grid-cols-12 sm:gap-8 sm:py-5"
                >
                  <p
                    className={`font-sans text-lg text-foreground sm:col-span-4 sm:text-xl ${index === 0 ? "" : "hidden sm:block"}`}
                  >
                    {index === 0 ? group.platform : "\u00a0"}
                  </p>
                  <p className="font-sans text-lg tabular-nums text-foreground sm:col-span-1">x {line.count}</p>
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
        <div className="lg:col-span-4 lg:sticky lg:top-24">
          <h2 className="font-sans text-5xl text-foreground sm:text-7xl">FAQ</h2>
          <p className="mt-4 max-w-xs font-sans text-sm leading-snug text-quiet">
            Identity, interfaces, and digital products.
          </p>
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
                  className="flex w-full cursor-pointer items-baseline gap-4 py-7 text-left sm:gap-8 sm:py-9"
                >
                  <span className="font-mono text-[11px] text-quiet">{String(index + 1).padStart(2, "0")}</span>
                  <span className="flex-1 font-sans text-2xl text-foreground sm:text-4xl">{item.q}</span>
                  <span className="font-sans text-4xl leading-none text-ice">{shown ? "−" : "+"}</span>
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
