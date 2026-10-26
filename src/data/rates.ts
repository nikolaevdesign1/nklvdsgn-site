/** Hourly rates from https://nklvdsgn.com/calc.html. Do not invent new numbers. */

export const roles = {
  cd: { label: "Creative Director", rate: 120 },
  ld: { label: "Lead Designer", rate: 85 },
  ui: { label: "UI/UX Designer", rate: 65 },
  jr: { label: "Junior Designer", rate: 45 },
  pm: { label: "Project Manager", rate: 55 },
  mo: { label: "Motion Designer", rate: 75 },
  st: { label: "Strategist", rate: 80 },
  cw: { label: "Copywriter", rate: 50 },
  fe: { label: "Frontend Dev", rate: 90 },
  be: { label: "Backend Dev", rate: 100 },
} as const;

export type RoleId = keyof typeof roles;

export type EstimateLine = {
  role: RoleId;
  hours: number;
};

export type Estimate = {
  name: string;
  lines: EstimateLine[];
  total: number;
};

const packages: { name: string; test: RegExp; lines: EstimateLine[] }[] = [
  {
    name: "Brand identity",
    test: /brand|logo|identity|айдент|логотип|фирмен/i,
    lines: [
      { role: "cd", hours: 20 },
      { role: "ld", hours: 40 },
      { role: "jr", hours: 30 },
      { role: "st", hours: 20 },
      { role: "pm", hours: 15 },
    ],
  },
  {
    name: "Website",
    test: /website|web site|site|landing|сайт|лендинг/i,
    lines: [
      { role: "ld", hours: 40 },
      { role: "ui", hours: 40 },
      { role: "pm", hours: 16 },
    ],
  },
  {
    name: "Mobile app",
    test: /mobile|ios|android|app\b|приложен/i,
    lines: [
      { role: "cd", hours: 24 },
      { role: "ld", hours: 60 },
      { role: "ui", hours: 80 },
      { role: "pm", hours: 24 },
    ],
  },
  {
    name: "Social media kit",
    test: /social|instagram|feed|соцсет|контент/i,
    lines: [{ role: "ld", hours: 18 }],
  },
  {
    name: "Motion",
    test: /motion|animation|video|моушн|анимац/i,
    lines: [{ role: "mo", hours: 40 }],
  },
];

const devPlatforms: { test: RegExp; label: string; baseH: number; perPageH: number; beH: number }[] = [
  { test: /webflow/i, label: "Webflow", baseH: 16, perPageH: 4, beH: 0 },
  { test: /framer/i, label: "Framer", baseH: 12, perPageH: 3, beH: 0 },
  { test: /tilda|тильд/i, label: "Tilda", baseH: 10, perPageH: 3, beH: 0 },
  { test: /wordpress/i, label: "WordPress", baseH: 28, perPageH: 6, beH: 36 },
  { test: /shopify/i, label: "Shopify", baseH: 24, perPageH: 5, beH: 24 },
  { test: /custom dev|fullstack|full-stack|разработ/i, label: "Custom Dev", baseH: 60, perPageH: 14, beH: 80 },
];

function lineCost(line: EstimateLine) {
  return line.hours * roles[line.role].rate;
}

export function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function estimateFromText(text: string): Estimate[] {
  const found = packages.filter((item) => item.test.test(text));
  const estimates: Estimate[] = found.map((item) => ({
    name: item.name,
    lines: item.lines,
    total: item.lines.reduce((sum, line) => sum + lineCost(line), 0),
  }));

  if (/website|web site|site|landing|сайт|лендинг/i.test(text)) {
    const platform = devPlatforms.find((item) => item.test.test(text));
    if (platform) {
      const pages = /store|магазин/i.test(text) ? 12 : /landing|лендинг/i.test(text) ? 1 : 6;
      const feHours = platform.baseH + platform.perPageH * pages;
      const lines: EstimateLine[] = [{ role: "fe", hours: feHours }];
      if (platform.beH > 0) lines.push({ role: "be", hours: platform.beH });
      estimates.push({
        name: `${platform.label} build`,
        lines,
        total: lines.reduce((sum, line) => sum + lineCost(line), 0),
      });
    }
  }

  return estimates;
}

export function formatEstimate(items: Estimate[]) {
  const total = items.reduce((sum, item) => sum + item.total, 0);
  const parts = items.map((item) => `${item.name} ${money(item.total)}`);
  return `Rough total ${money(total)}. ${parts.join(". ")}.`;
}

/** Draft Design Support sheet. Numbers are the studio calculator. Not approved. */
export const designSupportDraft = (Object.keys(roles) as RoleId[]).map((id) => ({
  role: roles[id].label,
  rate: roles[id].rate,
}));
