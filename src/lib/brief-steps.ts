type BriefBack = {
  canBack: boolean;
  back: () => void;
};

const idle: BriefBack = { canBack: false, back: () => {} };
let api: BriefBack = idle;
const listeners = new Set<() => void>();

export function setBriefBack(next: BriefBack) {
  api = next;
  listeners.forEach((listener) => listener());
}

export function subscribeBriefBack(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getBriefBack() {
  return api;
}

export function getBriefBackServer() {
  return idle;
}
