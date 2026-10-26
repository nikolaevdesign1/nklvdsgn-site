import type { Metadata } from "next";
import { BriefDialogHost } from "@/components/brief-dialog";
import { ContactsAtmosphere } from "@/components/contacts-atmosphere";
import { HandsScene } from "@/components/hands-scene";
import { ContactMascot } from "@/components/niko-face";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Contact",
  description: "Brief uixcorp.com.",
};

export default function ContactsPage() {
  return (
    <div className="relative min-h-dvh bg-background">
      <HandsScene />
      <ContactsAtmosphere />
      <div className="relative z-10">
        <SiteHeader />
        <main className="grid min-h-[calc(100dvh-4.5rem)] items-center overflow-visible lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <BriefDialogHost embedded />
          <div className="flex min-w-0 items-center justify-center overflow-visible px-4 py-4 lg:px-8">
            <ContactMascot />
          </div>
        </main>
      </div>
    </div>
  );
}
