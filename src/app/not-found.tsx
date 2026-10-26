import Link from "next/link";
import { ScrambleText } from "@/components/scramble-text";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="px-4 py-24 sm:px-8">
        <p className="font-mono text-[11px] text-ice">404</p>
        <h1 className="mt-4 font-sans text-4xl text-foreground">
          This page is not on the site.
        </h1>
        <Link
          href="/"
          className="mt-8 inline-block font-mono text-[11px] text-foreground hover:text-ice"
        >
          <ScrambleText text="Home" />
        </Link>
      </main>
    </div>
  );
}
