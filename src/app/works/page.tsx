import type { Metadata } from "next";
import { ProjectsBoard } from "@/components/projects-board";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WorksEdgeDots } from "@/components/works-edge-dots";

export const metadata: Metadata = {
  title: "Works",
  description: "Placeholder project frames for uixcorp.com.",
};

export default function ProjectsPage() {
  return (
    <div className="page-scroll relative min-h-dvh overflow-x-clip bg-background">
      <WorksEdgeDots />
      <SiteHeader />
      <main>
        <ProjectsBoard />
      </main>
      <SiteFooter />
    </div>
  );
}
