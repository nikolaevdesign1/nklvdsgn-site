/**
 * Stand-in projects for the public site.
 * Titles, fields, years, and images are placeholders.
 * Case frames are temporary pictures from
 * https://artemiilebedev.com/work/tensor-stax — not nklv.dsgn work.
 * Oleg will replace this list.
 */
export const PLACEHOLDER_SOURCE = "https://artemiilebedev.com/work/tensor-stax" as const;

export const releasePlatforms = [
  "Behance",
  "Dribbble",
  "Awwwards",
  "CSS Design Awards",
  "Other",
] as const;

export type ReleasePlatform = (typeof releasePlatforms)[number];

export const caseFrames = [
  "/placeholders/case/intro-1.avif",
  "/placeholders/case/intro-2.avif",
  "/placeholders/case/full-1.avif",
  "/placeholders/case/still.avif",
  "/placeholders/case/grid-1.avif",
  "/placeholders/case/grid-2.avif",
  "/placeholders/case/grid-3.avif",
  "/placeholders/case/full-2.avif",
] as const;

export type Project = {
  id: string;
  title: string;
  field: string;
  year: string;
  image: string;
  video: string;
  summary: string;
  award: string;
  client: string;
  platforms: ReleasePlatform[];
  placeholder: true;
  source: typeof PLACEHOLDER_SOURCE;
};

const summary =
  "Placeholder. A stand-in frame, not studio work. The picture is borrowed and marked.";

export const projects: Project[] = [
  {
    id: "ponder-ai",
    title: "Ponder AI",
    field: "Software",
    year: "2026",
    image: "/placeholders/ponder-ai.avif",
    video: "",
    summary,
    award: "Placeholder",
    client: "Placeholder",
    platforms: ["Behance"],
    placeholder: true,
    source: PLACEHOLDER_SOURCE,
  },
  {
    id: "cantor8",
    title: "Cantor8",
    field: "Business",
    year: "2026",
    image: "/placeholders/cantor8.avif",
    video: "",
    summary,
    award: "Placeholder",
    client: "Placeholder",
    platforms: ["Dribbble"],
    placeholder: true,
    source: PLACEHOLDER_SOURCE,
  },
  {
    id: "frequency",
    title: "Frequency Breathwork",
    field: "Wellness",
    year: "2026",
    image: "/placeholders/frequency.avif",
    video: "",
    summary,
    award: "Placeholder",
    client: "Placeholder",
    platforms: ["Awwwards"],
    placeholder: true,
    source: PLACEHOLDER_SOURCE,
  },
  {
    id: "goom-gum",
    title: "Goom Gum",
    field: "Music",
    year: "2025",
    image: "/placeholders/goom-gum.avif",
    video: "",
    summary,
    award: "Placeholder",
    client: "Placeholder",
    platforms: ["CSS Design Awards"],
    placeholder: true,
    source: PLACEHOLDER_SOURCE,
  },
  {
    id: "hungry-tiger",
    title: "Hungry Tiger",
    field: "Food & Drink",
    year: "2025",
    image: "/placeholders/hungry-tiger.avif",
    video: "",
    summary,
    award: "Placeholder",
    client: "Placeholder",
    platforms: ["Other"],
    placeholder: true,
    source: PLACEHOLDER_SOURCE,
  },
  {
    id: "oxi",
    title: "OXI Instruments",
    field: "Music Instruments",
    year: "2025",
    image: "/placeholders/oxi.avif",
    video: "",
    summary,
    award: "Placeholder",
    client: "Placeholder",
    platforms: ["Behance", "Dribbble"],
    placeholder: true,
    source: PLACEHOLDER_SOURCE,
  },
  {
    id: "monolith",
    title: "Monolith Studio",
    field: "Tattoo",
    year: "2024",
    image: "/placeholders/monolith.avif",
    video: "",
    summary,
    award: "Placeholder",
    client: "Placeholder",
    platforms: ["Awwwards"],
    placeholder: true,
    source: PLACEHOLDER_SOURCE,
  },
];

export function indexLabel(index: number) {
  return String(index + 1).padStart(2, "0");
}

export function projectById(id: string) {
  return projects.find((project) => project.id === id);
}

export const projectFields = [...new Set(projects.map((project) => project.field))];
