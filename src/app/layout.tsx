import type { Metadata } from "next";
import { Fragment_Mono, Space_Grotesk } from "next/font/google";
import { BriefGate } from "@/components/brief-dialog";
import { ClickGlitch } from "@/components/click-glitch";
import { CookieNotice } from "@/components/cookie-notice";
import { NikoFace } from "@/components/niko-face";
import { SmoothScroll } from "@/components/smooth-scroll";
import { SoundToggle } from "@/components/site-controls";
import { SiteSound } from "@/components/site-sound";
import { SocialLinks } from "@/components/social-links";
import "locomotive-scroll/dist/locomotive-scroll.css";
import "./globals.css";
import "./popup-glitch.css";

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
});

const fragment = Fragment_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-fragment",
});

export const metadata: Metadata = {
  title: {
    default: "uixcorp.com",
    template: "%s — uixcorp.com",
  },
  description: "uixcorp.com — design studio.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${grotesk.variable} ${fragment.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background font-sans text-foreground">
        <SmoothScroll />
        <ClickGlitch />
        <SiteSound />
        {children}
        <NikoFace />
        <BriefGate />
        <SocialLinks />
        <SoundToggle />
        <CookieNotice />
      </body>
    </html>
  );
}
