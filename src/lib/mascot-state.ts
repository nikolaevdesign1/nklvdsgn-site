export const MASCOT_MOODS = [
  "calm",
  "neutral",
  "happy",
  "wink",
  "angry",
  "surprised",
  "cute",
  "bored",
  "focus",
  "error",
  "joy",
  "sly",
  "listen",
  "music",
  "sad",
  "alarm",
  "glitch",
] as const;

export type MascotMood = (typeof MASCOT_MOODS)[number];

const SCREEN_MODES = new Set<MascotMood>(["listen", "music", "sad", "alarm", "glitch"]);
const CLICK_FACES: MascotMood[] = ["happy", "joy", "cute", "wink"];

const listeners = new Set<() => void>();
let baseMood: MascotMood = "calm";
let reaction: MascotMood | null = null;
let hover: MascotMood | null = null;
let reactionUntil = 0;
let bump = 0;
let published: MascotMood = "calm";

function emit() {
  published = hover ?? reaction ?? baseMood;
  listeners.forEach((listener) => listener());
}

export function isScreenMode(mood: MascotMood) {
  return SCREEN_MODES.has(mood);
}

export function isMascotMood(value: string): value is MascotMood {
  return (MASCOT_MOODS as readonly string[]).includes(value);
}

export function getMascotMood() {
  return published;
}

export function getMascotBump() {
  return bump;
}

export function subscribeMascot(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setMascotMood(next: MascotMood) {
  baseMood = next;
  reaction = null;
  reactionUntil = 0;
  emit();
}

export function setMascotHover(next: MascotMood | null) {
  if (hover === next) return;
  hover = next;
  emit();
}

export function pokeMascot() {
  bump += 1;
  if (!isScreenMode(baseMood)) {
    reaction = CLICK_FACES[Math.floor(Math.random() * CLICK_FACES.length)] ?? "happy";
    reactionUntil = performance.now() + 1600;
    window.setTimeout(() => {
      if (reaction && performance.now() >= reactionUntil) {
        reaction = null;
        emit();
      }
    }, 1620);
  }
  emit();
}
