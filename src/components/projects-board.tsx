"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { requestBrief } from "@/components/brief-dialog";
import { DiscussDock } from "@/components/discuss-dock";
import { ScrambleText } from "@/components/scramble-text";
import {
  projectFields,
  projects,
  releasePlatforms,
  type Project,
  type ReleasePlatform,
} from "@/data/projects";

const digits = "0123456789";
const awardedOn = releasePlatforms.filter((item) => item !== "Other");
const soonFields = projectFields.slice(0, 5);

function scrambleTo(text: string, frame: number) {
  return text
    .split("")
    .map((character, index) => {
      if (character === " ") return " ";
      if (frame > index * 2 + 3) return character;
      return digits[Math.floor(Math.random() * digits.length)];
    })
    .join("");
}

function Card({
  project,
  active,
  onEnter,
}: {
  project: Project;
  active: boolean;
  onEnter: (event: React.MouseEvent<HTMLElement>) => void;
}) {
  return (
    <article onMouseEnter={onEnter} className="group min-w-0 cursor-none">
      <Link href={`/works/${project.id}`} className="flex flex-col gap-2">
        <div className="relative aspect-video overflow-hidden bg-[#121214]">
          <Image
            src={project.image}
            alt=""
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="cyber-shot object-cover"
          />
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            <span className="bg-[#0a0a0b]/85 px-2 py-1 font-mono text-[11px] text-foreground">
              {project.field}
            </span>
          </div>
        </div>
        <h2 className="font-sans text-[16px] text-foreground">
          <ScrambleText text={project.title} active={active} />
        </h2>
        <p className="font-sans text-[14px] text-quiet">{project.summary}</p>
        <div className="flex items-start justify-between gap-4">
          <div className="font-mono text-[12px] text-foreground">
            <p>Award</p>
            <ul>
              {project.platforms.map((platform) => (
                <li key={platform}>{platform}</li>
              ))}
            </ul>
          </div>
          <div className="text-right font-mono text-[12px] text-foreground">
            <p>Client</p>
            <p>{project.client}</p>
          </div>
        </div>
      </Link>
    </article>
  );
}

export function ProjectsBoard() {
  const [field, setField] = useState("All");
  const [platform, setPlatform] = useState<"All" | ReleasePlatform>("All");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0, on: false });
  const [cursorText, setCursorText] = useState("View more");

  const visible = projects.filter((project) => {
    const fieldOk = field === "All" || project.field === field;
    const platformOk = platform === "All" || project.platforms.includes(platform);
    return fieldOk && platformOk;
  });

  useEffect(() => {
    if (!pointer.on) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      const timer = window.setTimeout(() => setCursorText("View more"), 0);
      return () => window.clearTimeout(timer);
    }
    let frame = 0;
    const timer = window.setInterval(() => {
      frame += 1;
      setCursorText(scrambleTo("View more", frame));
      if (frame > 24) {
        setCursorText("View more");
        window.clearInterval(timer);
      }
    }, 18);
    return () => window.clearInterval(timer);
  }, [pointer.on, hoverId]);

  useEffect(() => {
    if (!filtersOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFiltersOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtersOpen]);

  return (
    <div
      onMouseMove={(event) => {
        if (!pointer.on) return;
        setPointer((current) => ({ ...current, x: event.clientX, y: event.clientY }));
      }}
    >
      <div className="relative z-10 flex flex-col gap-8 px-4 pt-16 sm:px-6 sm:pt-20">
        <div className="flex flex-col gap-4">
          <nav aria-label="Breadcrumb" className="font-mono text-[12px] text-quiet">
            <Link href="/" className="hover:text-ice">
              Home
            </Link>
            <span> / </span>
            <span className="text-foreground">Works</span>
          </nav>
          <h1 className="font-sans text-5xl text-foreground sm:text-7xl">Works</h1>
        </div>
        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-center bg-foreground px-4 py-2 text-center font-mono text-[12px] leading-5 text-background hover:bg-ice lg:hidden"
          onClick={() => setFiltersOpen(true)}
        >
          Filters
        </button>
        <div className="hidden flex-row items-start justify-between gap-6 lg:flex">
          <FilterGroups
            field={field}
            platform={platform}
            onField={setField}
            onPlatform={setPlatform}
            awardedEnd
          />
        </div>
      </div>

      <div className={`lg:hidden ${filtersOpen ? "" : "pointer-events-none"}`} inert={filtersOpen ? undefined : true}>
        <button
          type="button"
          aria-label="Close filters"
          className={`fixed inset-0 z-50 cursor-pointer bg-black/60 transition-opacity duration-300 ${filtersOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setFiltersOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          className="fixed inset-x-0 bottom-0 z-50 flex min-h-[68dvh] max-h-[92dvh] flex-col gap-8 overflow-y-auto border-t border-white/15 bg-[#0a0a0b] px-6 pt-5 pb-12 transition-transform duration-300 ease-out sm:px-8 sm:pt-6 sm:pb-16"
          style={{ transform: filtersOpen ? "translateY(0)" : "translateY(100%)" }}
        >
          <div className="mx-auto h-1.5 w-12 bg-white/30" />
          <div className="flex items-center justify-between">
            <p className="font-mono text-[15px] text-foreground">Filters</p>
            <button
              type="button"
              className="cursor-pointer px-2 py-1 font-mono text-[15px] text-foreground hover:text-ice"
              onClick={() => setFiltersOpen(false)}
            >
              Close
            </button>
          </div>
          <FilterGroups field={field} platform={platform} onField={setField} onPlatform={setPlatform} size="lg" />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="mt-8 px-10 font-sans text-[15px] text-quiet sm:px-14 lg:px-20">No placeholder frames in this filter.</p>
      ) : null}

      <div
        className="relative z-10 mt-10 mb-4 box-border grid w-full min-w-0 grid-cols-1 gap-x-[28px] gap-y-24 px-4 sm:px-6 md:grid-cols-3"
        onMouseLeave={() => {
          setHoverId(null);
          setPointer((current) => ({ ...current, on: false }));
        }}
      >
        {visible.map((project) => (
          <Card
            key={project.id}
            project={project}
            active={hoverId === project.id}
            onEnter={(event) => {
              setHoverId(project.id);
              setPointer({ x: event.clientX, y: event.clientY, on: true });
            }}
          />
        ))}
        <ComingSoonCard />
      </div>

      <DiscussDock label="Discuss a project" />

      {pointer.on ? (
        <div
          className="pointer-events-none fixed z-50 font-mono text-[12px] text-ice"
          style={{ left: pointer.x + 14, top: pointer.y + 16 }}
        >
          {cursorText}
        </div>
      ) : null}
    </div>
  );
}

function ComingSoonCard() {
  return (
    <article className="flex h-full min-w-0 flex-col border border-white/10 bg-[#121214] px-4 py-5">
      <h2 className="font-sans text-[16px] text-foreground">Coming soon</h2>
      <p className="mt-3 font-sans text-[14px] text-quiet">Five projects are close this quarter.</p>
      <ul className="mt-4 flex flex-col gap-2">
        {soonFields.map((field) => (
          <li key={field} className="font-mono text-[12px] text-foreground">
            {field}
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={() => requestBrief()}
          className="flex w-full cursor-pointer items-center justify-center bg-foreground px-4 py-2 text-center font-mono text-[12px] leading-5 text-background hover:bg-ice"
        >
          Discuss a project
        </button>
      </div>
    </article>
  );
}

function FilterGroups({
  field,
  platform,
  onField,
  onPlatform,
  awardedEnd = false,
  size = "md",
}: {
  field: string;
  platform: "All" | ReleasePlatform;
  onField: (value: string) => void;
  onPlatform: (value: "All" | ReleasePlatform) => void;
  awardedEnd?: boolean;
  size?: "md" | "lg";
}) {
  const stackGap = size === "lg" ? "gap-4" : "gap-2";
  const wrapGap = size === "lg" ? "gap-3" : "gap-2";
  const labelClass = size === "lg" ? "font-mono text-[15px] text-foreground" : "font-mono text-[12px] text-foreground";
  return (
    <>
      <div className={`flex min-w-0 flex-col items-start ${stackGap}`}>
        <p className={labelClass}>Directions</p>
        <div className={`flex flex-wrap ${wrapGap}`} aria-label="Directions">
          <FilterChip size={size} active={field === "All"} onClick={() => onField("All")} label="All" />
          {projectFields.map((item) => (
            <FilterChip size={size} key={item} active={field === item} onClick={() => onField(item)} label={item} />
          ))}
        </div>
      </div>
      <div className={`flex min-w-0 flex-col ${stackGap} ${awardedEnd ? "items-end" : "items-start"}`}>
        <p className={labelClass}>Awarded on</p>
        <div className={`flex flex-wrap ${wrapGap} ${awardedEnd ? "justify-end" : ""}`} aria-label="Awarded on">
          <FilterChip size={size} active={platform === "All"} onClick={() => onPlatform("All")} label="All" />
          {awardedOn.map((item) => (
            <FilterChip size={size} key={item} active={platform === item} onClick={() => onPlatform(item)} label={item} />
          ))}
        </div>
      </div>
    </>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  size = "md",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  size?: "md" | "lg";
}) {
  const sizing = size === "lg" ? "px-4 py-3 text-[16px] leading-5" : "px-2 py-1 text-[12px]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer border font-mono ${sizing} ${active ? "border-foreground bg-foreground text-background" : "border-white/15 text-foreground hover:text-ice"}`}
    >
      {label}
    </button>
  );
}
