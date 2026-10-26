"use client";

import { usePathname } from "next/navigation";
import { useCookieNoticeOpen } from "@/components/cookie-notice";
import { ScrambleText } from "@/components/scramble-text";
import { BriefBackButton } from "@/components/site-controls";

export const socials = [
  { label: "BEHANCE", href: "https://www.behance.net/oleg_nikolaev1" },
  { label: "LINKEDIN", href: "https://www.linkedin.com/in/nikolaevdesign1/?isSelfProfile=true" },
  { label: "X(TWITTER)", href: "https://x.com/oleg_nikolaev1" },
  { label: "INSTAGRAM", href: "https://www.instagram.com/nikolaev_design1/" },
] as const;

function cookieSitsOnCorner(pathname: string) {
  return !(pathname === "/works" || pathname === "/about" || pathname.startsWith("/works/"));
}

export function SocialLinks() {
  const pathname = usePathname();
  const cookieOpen = useCookieNoticeOpen();
  const lift = cookieOpen && cookieSitsOnCorner(pathname);

  return (
    <div className={`fixed left-4 z-40 flex max-w-[calc(100vw-7.5rem)] flex-col items-start gap-3 sm:left-8 ${lift ? "bottom-36" : "bottom-4"}`}>
      {pathname === "/contacts" ? <BriefBackButton /> : null}
      <nav aria-label="Social" className="hidden flex-wrap items-center gap-x-4 gap-y-1.5 lg:flex">
        {socials.map((item) => (
          <a
            key={item.href}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[12px] leading-none text-foreground transition-colors duration-200 hover:text-ice"
          >
            <ScrambleText text={item.label} />
          </a>
        ))}
      </nav>
    </div>
  );
}
