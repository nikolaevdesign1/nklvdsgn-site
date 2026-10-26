import type { Metadata } from "next";
import { AboutBoard } from "@/components/about-board";

export const metadata: Metadata = {
  title: "About",
  description: "An independent design studio working between city lights and stars: identity, interfaces, and digital products.",
};

export default function AboutPage() {
  return <AboutBoard />;
}
