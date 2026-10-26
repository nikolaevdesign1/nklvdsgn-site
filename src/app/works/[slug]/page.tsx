import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { caseFrames, projectById, projects } from "@/data/projects";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = projectById(slug);
  return {
    title: project ? `${project.title} — Placeholder` : "Placeholder",
    description: "Placeholder project page. Pictures are not uixcorp.com work.",
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = projectById(slug);
  if (!project) notFound();
  const more = projects.filter((item) => item.id !== project.id).slice(0, 3);
  const [introA, introB, fullA, still, gridA, gridB, gridC, fullB] = caseFrames;

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main>
        <header className="flex flex-col gap-6 px-4 pt-8 pb-10 sm:px-8">
          <nav aria-label="Breadcrumb" className="font-mono text-[12px] text-quiet">
            <Link href="/" className="hover:text-ice">
              Home
            </Link>
            <span> / </span>
            <Link href="/works" className="hover:text-ice">
              Works
            </Link>
            <span> / </span>
            <span className="text-foreground">{project.title}</span>
          </nav>
          <p className="font-mono text-[12px] text-ice">Placeholder. Not uixcorp.com work.</p>
          <h1 className="max-w-5xl font-sans text-5xl leading-[0.95] text-foreground sm:text-7xl lg:text-8xl">
            {project.title}
          </h1>
          <p className="font-mono text-[12px] text-quiet">{project.year}</p>
        </header>

        <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 pb-12 sm:px-8 lg:grid-cols-[12rem_1fr]">
          <h2 className="font-mono text-[12px] text-quiet">About the project</h2>
          <p className="font-sans text-[15px] text-foreground">{project.summary}</p>
        </section>

        <section className="grid gap-3 px-4 sm:grid-cols-2 sm:px-8">
          <Frame src={introA} />
          <Frame src={introB} />
        </section>

        <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 sm:px-8 lg:grid-cols-[1fr_16rem]">
          <div className="flex flex-col gap-3">
            <h2 className="font-mono text-[12px] text-quiet">Project context</h2>
            <p className="font-sans text-[15px] text-foreground">
              Placeholder. The layout follows a borrowed case page. Nothing here is studio work.
            </p>
          </div>
          <dl className="grid gap-4 font-mono text-[12px]">
            <div>
              <dt className="text-quiet">Timeline</dt>
              <dd className="mt-1 text-foreground">Placeholder</dd>
            </div>
            <div>
              <dt className="text-quiet">Services</dt>
              <dd className="mt-1 text-foreground">Placeholder</dd>
            </div>
            <div>
              <dt className="text-quiet">Client</dt>
              <dd className="mt-1 text-foreground">{project.client}</dd>
            </div>
          </dl>
        </section>

        <Frame src={fullA} wide />
        <Frame src={still} wide />

        <section className="grid gap-3 px-4 py-3 sm:grid-cols-3 sm:px-8">
          <Frame src={gridA} />
          <Frame src={gridB} />
          <Frame src={gridC} />
        </section>

        <section className="grid items-stretch lg:grid-cols-[18rem_1fr]">
          <div className="flex items-end px-4 py-8 sm:px-8">
            <p className="font-sans text-[15px] text-quiet">Placeholder</p>
          </div>
          <Frame src={fullB} wide />
        </section>

        <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-16 sm:px-8">
          <h2 className="font-mono text-[12px] text-quiet">Awards and recognitions</h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {["01", "02", "03"].map((slot) => (
              <li key={slot} className="border border-white/10 p-4">
                <p className="font-mono text-[12px] text-ice">{slot}</p>
                <p className="mt-2 font-sans text-sm text-foreground">Placeholder</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-white/10 px-4 py-12 sm:px-8">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 className="font-sans text-3xl text-foreground">More work</h2>
            <Link href="/works" className="font-mono text-[12px] text-foreground hover:text-ice">
              View all work
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {more.map((item) => (
              <Link key={item.id} href={`/works/${item.id}`} className="flex flex-col gap-2">
                <span className="relative block aspect-[4/3] bg-[#121214]">
                  <Image src={item.image} alt="" fill sizes="33vw" className="object-cover" />
                </span>
                <span className="font-sans text-lg text-foreground">{item.title}</span>
                <span className="font-mono text-[12px] text-quiet">
                  {item.year} · Placeholder
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Frame({ src, wide }: { src: string; wide?: boolean }) {
  return (
    <figure className={wide ? "relative" : "relative"}>
      <div className={`relative w-full bg-[#121214] ${wide ? "aspect-[16/9]" : "aspect-[4/3]"}`}>
        <Image src={src} alt="" fill sizes={wide ? "100vw" : "50vw"} className="object-cover" />
      </div>
      <figcaption className="px-1 py-2 font-mono text-[12px] text-quiet">Placeholder</figcaption>
    </figure>
  );
}
