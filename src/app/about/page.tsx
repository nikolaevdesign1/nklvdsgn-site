import type { Metadata } from "next";
import { AboutBoard } from "@/components/about-board";

export const metadata: Metadata = {
  title: "About",
  description: "uixcorp.com is a design studio.",
};

export default function AboutPage() {
  return <AboutBoard />;
}
