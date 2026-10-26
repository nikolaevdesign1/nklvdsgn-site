const STORAGE_KEY = "uix.sound";

type Listener = (on: boolean) => void;

const listeners = new Set<Listener>();
let enabled = false;
let hydrated = false;
let ctx: AudioContext | null = null;
let droneBus: GainNode | null = null;
let droneStarted = false;
let speaking = false;

function emit() {
  listeners.forEach((listener) => listener(enabled));
}

export function subscribeSound(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readStored() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function getSoundOn() {
  if (!hydrated && typeof window !== "undefined") {
    enabled = readStored();
    hydrated = true;
  }
  return enabled;
}

function remember(next: boolean) {
  enabled = next;
  hydrated = true;
  try {
    sessionStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    return;
  }
}

function context() {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    ctx = new Ctor();
    droneBus = ctx.createGain();
    droneBus.gain.value = 0;
    droneBus.connect(ctx.destination);
  }
  return ctx;
}

function targetGain() {
  if (!enabled) return 0;
  return speaking ? 0.045 : 0.16;
}

function rampDrone() {
  if (!ctx || !droneBus) return;
  const now = ctx.currentTime;
  droneBus.gain.cancelScheduledValues(now);
  droneBus.gain.setValueAtTime(Math.max(droneBus.gain.value, 0.0001), now);
  droneBus.gain.exponentialRampToValueAtTime(Math.max(targetGain(), 0.0001), now + 0.35);
}

function startDrone() {
  const audio = context();
  if (!audio || !droneBus || droneStarted) return;
  droneStarted = true;
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 220;
  filter.Q.value = 0.4;
  filter.connect(droneBus);

  const partials = [
    { freq: 46, type: "sine" as const, gain: 0.2 },
    { freq: 46.35, type: "sine" as const, gain: 0.12 },
    { freq: 61.5, type: "triangle" as const, gain: 0.045 },
    { freq: 92.2, type: "sine" as const, gain: 0.02 },
  ];
  for (const partial of partials) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = partial.type;
    osc.frequency.value = partial.freq;
    gain.gain.value = partial.gain;
    osc.connect(gain).connect(filter);
    osc.start();
  }

  const sweep = audio.createOscillator();
  const sweepGain = audio.createGain();
  sweep.frequency.value = 0.03;
  sweepGain.gain.value = 90;
  sweep.connect(sweepGain).connect(filter.frequency);
  sweep.start();

  const length = audio.sampleRate * 2;
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
  const noise = audio.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const band = audio.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 160;
  band.Q.value = 0.6;
  const noiseGain = audio.createGain();
  noiseGain.gain.value = 0.02;
  const breath = audio.createOscillator();
  const breathGain = audio.createGain();
  breath.frequency.value = 0.018;
  breathGain.gain.value = 0.012;
  breath.connect(breathGain).connect(noiseGain.gain);
  breath.start();
  noise.connect(band).connect(noiseGain).connect(droneBus);
  noise.start();
}

export function armSound() {
  if (!getSoundOn()) return;
  try {
    const audio = context();
    if (!audio) return;
    void audio.resume();
    startDrone();
    rampDrone();
  } catch {
    return;
  }
}

export function setSoundOn(next: boolean) {
  remember(next);
  emit();
  if (!next) {
    stopSpeech();
    rampDrone();
    return;
  }
  armSound();
}

export function playClick(kind: "link" | "button") {
  if (!getSoundOn()) return;
  try {
    const audio = context();
    if (!audio) return;
    void audio.resume();
    startDrone();
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const start = kind === "link" ? 720 : 460;
    osc.type = "sine";
    osc.frequency.setValueAtTime(start, now);
    osc.frequency.exponentialRampToValueAtTime(start / 3, now + 0.05);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    osc.connect(gain).connect(audio.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch {
    return;
  }
}

function maleVoice(voice: SpeechSynthesisVoice) {
  const name = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  if (/female|woman|samantha|victoria|karen|moira|tessa|serena|kathy|zira|susan|fiona|veena/.test(name)) return false;
  return /male|david|daniel|alex|fred|rishi|arthur|aaron|gordon|bruce|ralph|tom|nathan|jorge|lee\b|google uk english male/.test(name);
}

function pickVoice(voices: SpeechSynthesisVoice[]) {
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  return english.find(maleVoice) ?? english[0] ?? null;
}

export function stopSpeech() {
  speaking = false;
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  rampDrone();
}

export function speakFriend(text: string) {
  if (!getSoundOn() || typeof window === "undefined" || !window.speechSynthesis) return;
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return;
  const synth = window.speechSynthesis;
  synth.getVoices();
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(clean);
  utter.lang = "en-US";
  const voice = pickVoice(synth.getVoices());
  if (voice) utter.voice = voice;
  utter.pitch = voice && maleVoice(voice) ? 0.62 : 0.36;
  utter.rate = 0.9;
  const mark = (active: boolean) => {
    speaking = active;
    rampDrone();
  };
  utter.onstart = () => mark(true);
  utter.onend = () => mark(false);
  utter.onerror = () => mark(false);
  synth.speak(utter);
}
