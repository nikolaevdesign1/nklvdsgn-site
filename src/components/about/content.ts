export const heroLine = "We design between city lights and stars.";

export const heroNote =
  "An independent studio for brands that work after dark. Small team, deep craft, a direct line to the person holding the pen.";

export const manifesto =
  "We make identity, interfaces, and digital products with sharp type, hard contrast, and quiet motion. Built for screens at night, and for the people looking at them.";

export const mission = {
  label: "Mission",
  text: "The brief is the starting line. We look for the one idea a brand can own, then push it through type, color, motion, and code until it holds on every screen. Nothing decorative. Everything earns its place.",
};

export const method = {
  label: "Method",
  text: "One small team covers strategy, design, and frontend. You talk to the people making the work, review it early, and watch it move in the browser before it is final. Consultation is free.",
};

export const photos = {
  green: "/about/person-green.jpg",
  choker: "/about/person-choker.jpg",
  lips: "/about/person-lips.jpg",
  red: "/about/person-red.jpg",
  black: "/about/person-black.jpg",
} as const;

export const services = [
  { name: "Brand identity", note: "Marks, type, color, and the rules that hold them together." },
  { name: "Art direction", note: "One visual language across every screen, frame, and surface." },
  { name: "Naming", note: "Short names that sound right out loud." },
  { name: "Website design", note: "Sites with a point of view, built to be remembered." },
  { name: "Interface design", note: "Product screens that stay easy to read at hour ten." },
  { name: "Mobile apps", note: "Flows that feel native to the phone in your hand." },
  { name: "Social media", note: "Templates and campaigns that read as one voice." },
  { name: "Motion", note: "Movement with weight. Short, precise, never decorative." },
  { name: "Strategy", note: "Positioning and priorities before any pixel." },
  { name: "Copywriting", note: "Plain words. One idea per line." },
  { name: "Frontend", note: "Design shipped as code: Next.js, WebGL, GSAP." },
  { name: "Product", note: "From first sketch to release, with one team." },
] as const;

export const awardsNote = "Platforms where the studio submits its work.";

export const awardGroups = [
  {
    platform: "Behance",
    lines: [
      { title: "Site of the Month", count: 2 },
      { title: "Honorable Mention", count: 3 },
    ],
  },
  {
    platform: "Awwwards",
    lines: [
      { title: "Site of the Day", count: 4 },
      { title: "Honorable Mention", count: 2 },
    ],
  },
  {
    platform: "CSS Design Awards",
    lines: [
      { title: "Site of the Day", count: 2 },
      { title: "Site of the Month", count: 1 },
      { title: "Honorable Mention", count: 3 },
    ],
  },
] as const;

export const faqNote = "Short answers. For the long ones, book a call.";

export const questions = [
  {
    q: "How do I start?",
    a: "Open Brief with Friend or the contact page. Consultation is free. We can talk through what you want.",
  },
  {
    q: "What does Friend do?",
    a: "Friend is the brief in this browser. It can guide you around the site, help you figure out where to start, and price a project or design support from the studio calculator. The figure is approximate and stays in this browser.",
  },
  {
    q: "What does the studio design?",
    a: "Identity, interfaces, and digital products. The studio list covers brand identity, art direction, websites, interface design, mobile apps, motion, strategy, and frontend.",
  },
  {
    q: "How long does a project take?",
    a: "There is no fixed schedule on this site. Timing comes out of the brief, and a call is the place to talk it through.",
  },
  {
    q: "How do I reach the studio?",
    a: "Open Contacts. The brief is on that page, and the studio inbox is info@uixcorp.com.",
  },
] as const;
