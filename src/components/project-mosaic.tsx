"use client";

import Image from "next/image";
import { ScrambleText } from "@/components/scramble-text";
import { indexLabel, projects } from "@/data/projects";
import { cn } from "cn";

const frames = [
  "col-span-12 md:col-span-8",
  "col-span-12 md:col-span-4",
  "col-span-12 md:col-span-5",
  "col-span-12 md:col-span-7",
  "col-span-6",
  "col-span-6",
  "col-span-12",
];

const ratios = [
  "aspect-[16/10]",
  "aspect-[4/5] md:aspect-auto md:h-full",
  "aspect-[16/10]",
  "aspect-[16/10]",
  "aspect-square",
  "aspect-square",
  "aspect-[21/9]",
];

export function ProjectMosaic() {
  return (
    <ul className="grid grid-cols-12 items-stretch gap-3">
      {projects.map((project, index) => (
        <li key={project.id} className={cn("min-w-0", frames[index])}>
          <article className="group relative h-full overflow-hidden bg-[#121214]">
            <div className={cn("relative w-full", ratios[index])}>
              <Image
                src={project.image}
                alt=""
                fill
                sizes="(min-width: 768px) 60vw, 100vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/40 to-transparent p-4">
              <p className="font-mono text-[11px] text-ice">
                {indexLabel(index)}
                <span className="ml-3 text-quiet">Placeholder</span>
              </p>
              <p className="mt-1 font-sans text-lg text-foreground sm:text-2xl">
                <ScrambleText text={project.title} />
              </p>
              <p className="mt-1 font-mono text-[11px] text-quiet">
                {project.field} · {project.year}
              </p>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
