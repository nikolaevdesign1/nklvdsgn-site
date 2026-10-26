"use client";

import { ArrowUp, History, Lightbulb, Mic, Plus, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MascotCanvas } from "@/components/mascot-stage";
import { NikoMark } from "@/components/niko-face";
import { ScrambleText } from "@/components/scramble-text";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { estimateFromText, formatEstimate } from "@/data/rates";
import { setBriefBack } from "@/lib/brief-steps";
import { isMascotMood, setMascotMood, type MascotMood } from "@/lib/mascot-state";
import { getSoundOn, speakFriend, stopSpeech, subscribeSound } from "@/lib/sound";
import { CALENDLY_URL } from "@/lib/links";
import { proposalPdf } from "@/lib/pdf";
import { cn } from "cn";

const STORAGE_KEY = "nklv.brief";

type PathKind = "order" | "career" | "talk";
type Flow = "menu" | "chat" | "service";
type Pending = "make" | "deadline" | "budget" | "name" | "contact" | "role" | "portfolio" | "topic" | "service" | null;
type Panel = "live" | "list" | "past";

const STUDIO_MAIL = "info@uixcorp.com";
const OPENING = "Hi. I'm Friend. I'll be glad to help. Tell me what I can do for you.";
const PATHS: { id: PathKind; label: string }[] = [
  { id: "order", label: "Order a project" },
  { id: "career", label: "Career" },
  { id: "talk", label: "Just talk" },
];
const MAKE = ["Design a website", "Brand identity", "A mobile app", "Motion"];

type ChatMessage = {
  id: string;
  role: "user" | "bot";
  text: string;
  files: string[];
  mood?: MascotMood;
};

type Conversation = {
  messages: ChatMessage[];
  flow: Flow;
  path: PathKind | null;
  name: string;
  task: string;
  deadline: string;
  budget: string;
  contact: string;
  role: string;
  portfolio: string;
  topic: string;
  pending: Pending;
  received: boolean;
  receivedAt?: string;
};

type HistoryThread = Conversation & {
  id: string;
  title: string;
  archivedAt: string;
};

type BriefStore = {
  current: null;
  history: HistoryThread[];
};

const prompts = ["Design a website", "Brand identity", "A mobile app", "Motion"];

const placeholderLines = [
  "Design a website for a product launch",
  "What should we start with?",
  "Price a brand and design support",
  "Ask about the projects",
] as const;

type DraftFile = {
  id: string;
  name: string;
  preview: string | null;
};

type SpeechResult = {
  readonly isFinal: boolean;
  readonly 0: { transcript: string };
};

type SpeechResultEventLike = {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechResult>;
};

type SpeechRecognizer = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechResultEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function createRecognizer() {
  const host = window as Window & {
    SpeechRecognition?: new () => SpeechRecognizer;
    webkitSpeechRecognition?: new () => SpeechRecognizer;
  };
  const Ctor = host.SpeechRecognition ?? host.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

function revokeFiles(list: DraftFile[]) {
  for (const file of list) {
    if (file.preview) URL.revokeObjectURL(file.preview);
  }
}

function useTypedPlaceholder(active: boolean) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    if (!active) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setShown(placeholderLines[0]);
      return;
    }

    let line = 0;
    let index = 0;
    let deleting = false;
    let timer = 0;

    const tick = () => {
      const current = placeholderLines[line];
      if (!deleting) {
        index += 1;
        setShown(current.slice(0, index));
        if (index >= current.length) {
          deleting = true;
          timer = window.setTimeout(tick, 1200);
          return;
        }
        timer = window.setTimeout(tick, 42);
        return;
      }
      index -= 1;
      setShown(current.slice(0, Math.max(index, 0)));
      if (index <= 0) {
        deleting = false;
        line = (line + 1) % placeholderLines.length;
        timer = window.setTimeout(tick, 320);
        return;
      }
      timer = window.setTimeout(tick, 24);
    };

    timer = window.setTimeout(tick, 360);
    return () => window.clearTimeout(timer);
  }, [active]);

  return shown;
}

const listeners = new Set<() => void>();
const openListeners = new Set<() => void>();
const EMPTY_STORE: BriefStore = { current: null, history: [] };
let cachedRaw: string | null | undefined;
let cachedStore: BriefStore = EMPTY_STORE;
let openConversation: Conversation = emptyConversation();
let archivedSignature = "";
let epoch = 0;
let dialogOpen = false;

const briefOpenListeners = new Set<() => void>();

function publishBriefOpen() {
  briefOpenListeners.forEach((listener) => listener());
}

export function subscribeBriefOpen(listener: () => void) {
  briefOpenListeners.add(listener);
  return () => briefOpenListeners.delete(listener);
}

export function getBriefOpen() {
  return dialogOpen;
}

export function requestBrief() {
  const open = openListeners.values().next().value;
  open?.();
}

export function BriefButton({ label, className }: { label: string; className?: string }) {
  return (
    <button type="button" onClick={() => requestBrief()} className={className}>
      <ScrambleText text={label} />
    </button>
  );
}

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const PENDING_VALUES: Pending[] = ["make", "deadline", "budget", "name", "contact", "role", "portfolio", "topic", "service"];

function isPending(value: unknown): value is Pending {
  return value === null || (typeof value === "string" && PENDING_VALUES.includes(value as Pending));
}

function isPath(value: unknown): value is PathKind {
  return value === "order" || value === "career" || value === "talk";
}

function isFlow(value: unknown): value is Flow {
  return value === "menu" || value === "chat" || value === "service";
}

function emptyConversation(): Conversation {
  return {
    messages: [],
    flow: "menu",
    path: null,
    name: "",
    task: "",
    deadline: "",
    budget: "",
    contact: "",
    role: "",
    portfolio: "",
    topic: "",
    pending: null,
    received: false,
  };
}

function chatConversation(): Conversation {
  return { ...emptyConversation(), flow: "chat" };
}

function cloneConversation(conversation: Conversation): Conversation {
  return {
    ...conversation,
    messages: conversation.messages.map((message) => ({ ...message, files: [...message.files] })),
  };
}

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `brief-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sameMessages(left: ChatMessage[], right: ChatMessage[]) {
  if (left.length !== right.length) return false;
  return left.every(
    (message, index) => message.id === right[index]?.id && message.text === right[index]?.text,
  );
}

function signatureOf(conversation: Conversation) {
  return conversation.messages.map((message) => message.id).join("|");
}

function threadTitle(conversation: Conversation) {
  const first = conversation.messages.find((message) => message.role === "user" && message.text.trim());
  const raw = (first?.text || first?.files[0] || "Brief").replace(/\s+/g, " ").trim();
  return raw.length > 72 ? `${raw.slice(0, 69)}...` : raw;
}

function toThread(conversation: Conversation): HistoryThread {
  return {
    messages: [...conversation.messages],
    flow: conversation.flow,
    name: conversation.name,
    task: conversation.task,
    deadline: conversation.deadline,
    budget: conversation.budget,
    path: conversation.path,
    contact: conversation.contact,
    role: conversation.role,
    portfolio: conversation.portfolio,
    topic: conversation.topic,
    pending: conversation.pending,
    received: conversation.received,
    receivedAt: conversation.receivedAt,
    id: makeId(),
    title: threadTitle(conversation),
    archivedAt: new Date().toISOString(),
  };
}

function asMessage(value: unknown, index: number): ChatMessage | null {
  if (!value || typeof value !== "object") return null;
  const message = value as Partial<ChatMessage>;
  if (message.role !== "user" && message.role !== "bot") return null;
  if (typeof message.text !== "string") return null;
  return {
    id: typeof message.id === "string" && message.id ? message.id : `m-${index}`,
    role: message.role,
    text: message.text,
    files: Array.isArray(message.files)
      ? message.files.filter((file): file is string => typeof file === "string")
      : [],
    mood: typeof message.mood === "string" && isMascotMood(message.mood) ? message.mood : undefined,
  };
}

function asConversation(value: unknown): Conversation | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<Conversation>;
  if (!Array.isArray(record.messages)) return null;
  const messages = record.messages
    .map((message, index) => asMessage(message, index))
    .filter((message): message is ChatMessage => message !== null);
  if (messages.length !== record.messages.length) return null;
  const pending = isPending(record.pending) ? record.pending : null;
  return {
    messages,
    flow: isFlow(record.flow) ? record.flow : "menu",
    path: isPath(record.path) ? record.path : null,
    name: typeof record.name === "string" ? record.name : "",
    task: typeof record.task === "string" ? record.task : "",
    deadline: typeof record.deadline === "string" ? record.deadline : "",
    budget: typeof record.budget === "string" ? record.budget : "",
    contact: typeof record.contact === "string" ? record.contact : "",
    role: typeof record.role === "string" ? record.role : "",
    portfolio: typeof record.portfolio === "string" ? record.portfolio : "",
    topic: typeof record.topic === "string" ? record.topic : "",
    pending,
    received: Boolean(record.received),
    receivedAt: typeof record.receivedAt === "string" ? record.receivedAt : undefined,
  };
}

function asThread(value: unknown): HistoryThread | null {
  const conversation = asConversation(value);
  if (!conversation) return null;
  const record = value as Partial<HistoryThread>;
  return {
    ...conversation,
    id: typeof record.id === "string" && record.id ? record.id : makeId(),
    title: typeof record.title === "string" && record.title ? record.title : threadTitle(conversation),
    archivedAt:
      typeof record.archivedAt === "string" && record.archivedAt
        ? record.archivedAt
        : new Date().toISOString(),
  };
}

function normalizeParsed(parsed: unknown): BriefStore {
  if (!parsed || typeof parsed !== "object") return EMPTY_STORE;
  const record = parsed as { current?: unknown; history?: unknown; messages?: unknown };
  const split =
    Array.isArray(record.history) || Object.prototype.hasOwnProperty.call(record, "current");
  if (split) {
    const history = Array.isArray(record.history)
      ? record.history
          .map((item) => asThread(item))
          .filter((item): item is HistoryThread => item !== null)
      : [];
    const current = asConversation(record.current);
    if (
      current &&
      current.messages.length > 0 &&
      !history.some((item) => sameMessages(item.messages, current.messages))
    ) {
      history.unshift(toThread(current));
    }
    return history.length ? { current: null, history } : EMPTY_STORE;
  }
  const legacy = asConversation(record);
  if (legacy && legacy.messages.length > 0) return { current: null, history: [toThread(legacy)] };
  return EMPTY_STORE;
}

function readStore(): BriefStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedStore;
    cachedRaw = raw;
    if (!raw) {
      cachedStore = EMPTY_STORE;
      return cachedStore;
    }
    cachedStore = normalizeParsed(JSON.parse(raw) as unknown);
    return cachedStore;
  } catch {
    return cachedStore;
  }
}

function writeStore(history: HistoryThread[]) {
  const store: BriefStore = { current: null, history };
  try {
    const raw = JSON.stringify(store);
    localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedStore = store;
  } catch {
    cachedStore = store;
  }
  emit();
}

function archiveSnapshot() {
  const current = openConversation;
  if (!current.messages.length) return;
  const signature = signatureOf(current);
  if (signature === archivedSignature) return;
  const thread = toThread(current);
  const history = [
    thread,
    ...readStore().history.filter((item) => !sameMessages(item.messages, current.messages)),
  ].slice(0, 40);
  writeStore(history);
  archivedSignature = signature;
}

function appendArchivedReply(saved: Conversation, reply: ChatMessage) {
  const history = readStore().history.map((item) =>
    sameMessages(item.messages, saved.messages)
      ? { ...item, messages: [...item.messages, reply] }
      : item,
  );
  writeStore(history);
}

function nameFrom(text: string) {
  return text.match(
    /(?:my name is|i am|i'm|this is)\s+([A-Za-z][\w'’-]+(?:\s+[A-Za-z][\w'’-]+){0,2})/i,
  )?.[1];
}

function deadlineFrom(text: string) {
  return text.match(/(?:deadline|due|need it|by|срок)[:\s]+([^\n.]{2,48})/i)?.[1];
}

function budgetFrom(text: string) {
  return text.match(
    /(?:budget|бюджет)[:\s]+([^\n.]{1,40})|\$\s?\d[\d,\s]*k?|\d[\d,\s]*\s?(?:usd|k)\b/i,
  )?.[0];
}

function stripHourlyRates(text: string) {
  return text
    .split(/(?<=[.?!])\s+/)
    .filter((sentence) => !(/\d+\s*h\b/i.test(sentence) && /\$[\d,]+/.test(sentence)))
    .join(" ")
    .replace(/\d+\s*h\s*[×x*]\s*\$[\d,]+/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function replyFor(state: {
  name: string;
  task: string;
  deadline: string;
  budget: string;
  files: string[];
}) {
  const estimates = estimateFromText(state.task);
  const parts: string[] = [];
  if (state.files.length) {
    parts.push(`Attached: ${state.files.join(", ")}. Files stay in this browser.`);
  }
  if (estimates.length) parts.push(formatEstimate(estimates));

  if (!estimates.length && !state.task.trim()) {
    return {
      text: "Name the work: brand identity, a website, a mobile app, a social kit, or motion.",
      pending: null as Pending,
      received: false,
      mood: "listen" as MascotMood,
    };
  }
  if (!estimates.length) {
    return {
      text: `${parts.join(" ")} I can price brand identity, a website, a mobile app, a social kit, or motion. Name one of those.`.trim(),
      pending: null as Pending,
      received: false,
      mood: "glitch" as MascotMood,
    };
  }
  if (!state.name) {
    return {
      text: `${parts.join(" ")} What is your name?`,
      pending: "name" as Pending,
      received: false,
      mood: "happy" as MascotMood,
    };
  }
  if (!state.deadline) {
    return {
      text: `${parts.join(" ")} When do you need it?`,
      pending: "deadline" as Pending,
      received: false,
      mood: "surprised" as MascotMood,
    };
  }
  if (!state.budget) {
    return {
      text: `${parts.join(" ")} What is the budget?`,
      pending: "budget" as Pending,
      received: false,
      mood: "music" as MascotMood,
    };
  }
  return {
    text: `${parts.join(" ")} Request received. ${state.name}, ${state.deadline}, budget ${state.budget}. Saved in this browser.`,
    pending: null as Pending,
    received: true,
    mood: "joy" as MascotMood,
  };
}

function RichText({ text }: { text: string }) {
  const parts = text.split(/(\$[\d,]+)/g);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("$") ? (
          <span key={`${part}-${index}`} className="text-ice">
            {part}
          </span>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </>
  );
}

function BotLine({
  text,
  instant = false,
  prominent = false,
  hero = false,
  voice = false,
  onDone,
}: {
  text: string;
  instant?: boolean;
  prominent?: boolean;
  hero?: boolean;
  voice?: boolean;
  onDone?: () => void;
}) {
  const priced = text.includes("Rough total");
  const [count, setCount] = useState(instant ? text.length : 0);
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    if (instant) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      const timer = window.setTimeout(() => setCount(text.length), 0);
      return () => window.clearTimeout(timer);
    }
    const started = performance.now();
    const timer = window.setInterval(() => {
      const next = Math.min(text.length, Math.floor((performance.now() - started) / 18));
      setCount(next);
      if (next >= text.length) {
        if (priced) setGlitch(true);
        window.clearInterval(timer);
      }
    }, 32);
    return () => window.clearInterval(timer);
  }, [instant, priced, text]);

  const done = instant || count >= text.length;

  useEffect(() => {
    if (done) onDone?.();
  }, [done, onDone]);

  useEffect(() => {
    if (!voice || instant) return;
    if (getSoundOn()) speakFriend(text);
    const unsubscribe = subscribeSound((on) => {
      if (on) speakFriend(text);
      else stopSpeech();
    });
    return () => {
      unsubscribe();
    };
  }, [instant, text, voice]);

  return (
    <p
      className={cn(
        "mt-1 font-sans text-foreground",
        hero ? "text-3xl leading-[1.05] sm:text-5xl" : prominent ? "text-xl leading-[1.2] sm:text-2xl" : "text-[13px]",
        glitch && "cyber-reply",
      )}
    >
      {done ? <RichText text={text} /> : text.slice(0, count)}
    </p>
  );
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function downloadProposal(stored: Conversation) {
  const estimates = estimateFromText(stored.task);
  const blob = proposalPdf([
    "uixcorp.com",
    "Commercial proposal",
    "Placeholder",
    `Name: ${stored.name || "Placeholder"}`,
    `Work: ${(stored.task || "Placeholder").replace(/\s+/g, " ").slice(0, 180)}`,
    `Deadline: ${stored.deadline || "Placeholder"}`,
    `Budget: ${stored.budget || "Placeholder"}`,
    estimates.length ? formatEstimate(estimates) : "Rough total Placeholder",
    "Draft. Not a contract.",
  ]);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "nklv-proposal.pdf";
  anchor.click();
  URL.revokeObjectURL(url);
}

type SpokenControl = "choices" | "field" | "done" | "wait";

type SpokenBeat = {
  text: string;
  mood: MascotMood;
  patch: Pick<
    Conversation,
    "path" | "name" | "task" | "deadline" | "budget" | "contact" | "role" | "portfolio" | "topic" | "pending" | "received" | "receivedAt"
  >;
};

function fieldLabel(pending: Pending, flow: Flow) {
  if (flow === "chat") return "Your message";
  if (pending === "deadline") return "When do you need it?";
  if (pending === "budget") return "What is the budget?";
  if (pending === "name") return "What is your name?";
  if (pending === "contact") return "How should we reach you?";
  if (pending === "role") return "What do you want to do?";
  if (pending === "portfolio") return "What is your portfolio link?";
  if (pending === "topic") return "What do you want to talk about?";
  return "Message";
}

function fieldPlaceholder(pending: Pending, flow: Flow) {
  if (flow === "chat") return "Your message";
  if (pending === "deadline") return "When you need it";
  if (pending === "budget") return "The budget";
  if (pending === "name") return "Your name";
  if (pending === "contact") return "How to reach you";
  if (pending === "role") return "What you want to do";
  if (pending === "portfolio") return "A link";
  if (pending === "topic") return "What to talk about";
  return "Your answer";
}

function choiceSet(live: Conversation) {
  if (live.flow !== "menu") return null;
  if (!live.path) return PATHS.map((item) => item.label);
  if (live.pending === "make") return MAKE;
  return null;
}

function spokenControl(live: Conversation, thinking: boolean, lineReady: boolean): SpokenControl {
  if (thinking || !lineReady || live.pending === "service") return "wait";
  if (live.flow === "chat") return "field";
  const last = live.messages[live.messages.length - 1];
  if (!last) return live.flow === "menu" ? "choices" : "field";
  if (last.role === "user") return "wait";
  if (live.received) return "done";
  if (live.pending === "make") return "choices";
  if (live.pending) return "field";
  return "wait";
}

function applyAnswer(base: Conversation, text: string): SpokenBeat | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const keep = {
    path: base.path,
    name: base.name,
    task: base.task,
    deadline: base.deadline,
    budget: base.budget,
    contact: base.contact,
    role: base.role,
    portfolio: base.portfolio,
    topic: base.topic,
    pending: base.pending,
    received: false,
    receivedAt: base.receivedAt,
  };

  if (!base.path) {
    const path = PATHS.find((item) => item.label === trimmed)?.id;
    if (!path) return null;
    if (path === "order") {
      return {
        text: "What should we make?",
        mood: "happy",
        patch: { ...keep, path, pending: "make" },
      };
    }
    if (path === "career") {
      return {
        text: "What do you want to do?",
        mood: "sly",
        patch: { ...keep, path, pending: "role" },
      };
    }
    return {
      text: "What do you want to talk about?",
      mood: "listen",
      patch: { ...keep, path, pending: "topic" },
    };
  }

  if (base.path === "order" && base.pending === "make") {
    const estimates = estimateFromText(trimmed);
    if (!estimates.length) {
      return {
        text: "I can price brand identity, a website, a mobile app, a social kit, or motion. Name one of those.",
        mood: "glitch",
        patch: { ...keep, task: trimmed, pending: "make" },
      };
    }
    return {
      text: `${formatEstimate(estimates)} When do you need it?`,
      mood: "surprised",
      patch: { ...keep, task: trimmed, pending: "deadline" },
    };
  }

  if (base.pending === "deadline") {
    return {
      text: "What is the budget?",
      mood: "music",
      patch: { ...keep, deadline: trimmed, pending: "budget" },
    };
  }
  if (base.pending === "budget") {
    return {
      text: "What is your name?",
      mood: "wink",
      patch: { ...keep, budget: trimmed, pending: "name" },
    };
  }
  if (base.pending === "role") {
    return {
      text: "What is your portfolio link?",
      mood: "cute",
      patch: { ...keep, role: trimmed, pending: "portfolio" },
    };
  }
  if (base.pending === "portfolio") {
    return {
      text: "What is your name?",
      mood: "happy",
      patch: { ...keep, portfolio: trimmed, pending: "name" },
    };
  }
  if (base.pending === "topic") {
    return {
      text: "What is your name?",
      mood: "happy",
      patch: { ...keep, topic: trimmed, pending: "name" },
    };
  }
  if (base.pending === "name") {
    return {
      text: "How should we reach you?",
      mood: "listen",
      patch: { ...keep, name: trimmed, pending: "contact" },
    };
  }
  if (base.pending === "contact") {
    const name = base.name || "there";
    const detail =
      base.path === "order"
        ? `${name}, ${base.deadline}, budget ${base.budget}`
        : name;
    return {
      text: `Request received. ${detail}. Saved in this browser.`,
      mood: "joy",
      patch: {
        ...keep,
        contact: trimmed,
        pending: null,
        received: true,
        receivedAt: new Date().toISOString(),
      },
    };
  }
  return null;
}

function SpokenBrief({
  live,
  thinking,
  draft,
  error,
  onDraft,
  onSend,
  onRestart,
  onContinue,
  voice = false,
}: {
  live: Conversation;
  thinking: boolean;
  draft: string;
  error: string;
  onDraft: (value: string) => void;
  onSend: (text: string) => void;
  onRestart: () => void;
  onContinue: () => void;
  voice?: boolean;
}) {
  const last = live.messages[live.messages.length - 1];
  const lastBot = [...live.messages].reverse().find((message) => message.role === "bot");
  const [lineReady, setLineReady] = useState(live.messages.length > 0 && last?.role === "bot" && last.text.length === 0);
  const [copied, setCopied] = useState(false);
  const readyFor = lastBot?.id ?? (live.messages.length === 0 ? "opening" : "");

  useEffect(() => {
    setLineReady(false);
    setCopied(false);
  }, [readyFor]);

  const control = spokenControl(live, thinking, lineReady);
  const choices = choiceSet(live);
  const markReady = () => setLineReady(true);
  const continueRef = useRef(onContinue);
  continueRef.current = onContinue;

  useEffect(() => {
    if (live.pending !== "service" || !lineReady || thinking) return;
    continueRef.current();
  }, [live.pending, lineReady, thinking]);

  async function copyMail() {
    try {
      await navigator.clipboard.writeText(STUDIO_MAIL);
    } catch {
      const area = document.createElement("textarea");
      area.value = STUDIO_MAIL;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
  }

  return (
    <div data-brief="" data-brief-control={control} data-brief-path={live.path ?? ""} data-brief-flow={live.flow} className="flex max-w-xl flex-col gap-8 text-white">
      <h1 className="sr-only">Brief with Friend</h1>
      {live.messages.length === 0 ? (
        <BotLine key="opening" text={OPENING} hero voice={voice} onDone={markReady} />
      ) : (
        <div className="flex flex-col gap-6">
          {live.messages.map((message) => {
            const current = message.id === last?.id && message.role === "bot";
            return (
              <div key={message.id}>
                <p className="font-mono text-[12px] text-quiet">{message.role === "user" ? "You" : "Friend"}</p>
                {message.text ? (
                  message.role === "bot" ? (
                    <BotLine text={message.text} instant={!current} prominent={current} voice={voice && current} onDone={current ? markReady : undefined} />
                  ) : (
                    <p className="mt-1 font-sans text-[13px] text-foreground">{message.text}</p>
                  )
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {control === "choices" && choices ? (
        <div className="flex flex-col items-start gap-3">
          <div className="flex flex-wrap gap-2">
            {choices.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={thinking}
                className="rounded-full border border-white/15 px-4 py-2.5 font-mono text-[13px] text-foreground hover:text-ice disabled:opacity-50"
                onClick={() => onSend(prompt)}
              >
                {prompt}
              </button>
            ))}
            {live.flow === "menu" && live.messages.length === 0 ? (
              <button
                type="button"
                data-brief-copy=""
                className="rounded-full border border-white/15 px-4 py-2.5 font-mono text-[13px] text-foreground hover:text-ice disabled:opacity-50"
                onClick={() => void copyMail()}
              >
                {copied ? "Copied" : STUDIO_MAIL}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {control === "field" ? (
        <form
          className="max-w-xl"
          onSubmit={(event) => {
            event.preventDefault();
            onSend(draft);
          }}
        >
          <label className="sr-only" htmlFor="brief-spoken">
            {fieldLabel(live.pending, live.flow)}
          </label>
          <input
            id="brief-spoken"
            value={draft}
            placeholder={fieldPlaceholder(live.pending, live.flow)}
            disabled={thinking}
            enterKeyHint="send"
            autoComplete={live.pending === "name" ? "name" : "off"}
            onChange={(event) => onDraft(event.target.value)}
            className="w-full border-0 border-b border-white/20 bg-transparent py-3 font-sans text-lg text-white outline-none placeholder:text-quiet disabled:opacity-50"
          />
          {error ? <p className="mt-3 font-mono text-[12px] text-danger">{error}</p> : null}
        </form>
      ) : null}

      {control === "done" ? (
        <div className="flex max-w-xl flex-col gap-3">
          {live.path === "order" ? (
            <>
              <p className="font-sans text-sm">Proposal ready.</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="h-8 rounded-none bg-foreground px-3 font-mono text-[12px] text-background hover:bg-ice hover:text-background"
                  onClick={() => downloadProposal(live)}
                >
                  Download proposal
                </Button>
                <a
                  href={CALENDLY_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center border border-white/15 px-3 font-mono text-[12px] text-foreground hover:text-ice"
                >
                  Book a call
                </a>
                <a
                  href={`mailto:${STUDIO_MAIL}`}
                  className="inline-flex h-8 items-center border border-white/15 px-3 font-mono text-[12px] text-foreground hover:text-ice"
                >
                  {STUDIO_MAIL}
                </a>
              </div>
            </>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="h-8 w-fit rounded-none border-white/15 bg-transparent px-3 font-mono text-[12px] text-foreground hover:bg-transparent hover:text-ice"
            onClick={onRestart}
          >
            Write another
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function DialogMascot({ className }: { className?: string }) {
  const [still, setStill] = useState(false);
  if (still) return <NikoMark className={className} />;
  return (
    <div className={cn("relative shrink-0 overflow-visible", className)} aria-hidden>
      <div className="absolute inset-0">
        <MascotCanvas loosen={1.55} onFail={() => setStill(true)} />
      </div>
    </div>
  );
}

function Transcript({ messages, instant }: { messages: ChatMessage[]; instant: boolean }) {
  return (
    <>
      {messages.map((message) => (
        <div key={message.id}>
          <div
            className={
              message.role === "user"
                ? "border border-white/10 bg-white/5 px-3 py-2"
                : "min-w-0 px-0 py-1"
            }
          >
            <p className="font-mono text-[12px] text-quiet">
              {message.role === "user" ? "You" : "Friend"}
            </p>
            {message.text ? (
              message.role === "bot" ? (
                <BotLine text={message.text} instant={instant} />
              ) : (
                <p className="mt-1 font-sans text-[13px] text-foreground">{message.text}</p>
              )
            ) : null}
            {message.files.length ? (
              <p className="mt-1 font-mono text-[12px] text-ice">{message.files.join(", ")}</p>
            ) : null}
          </div>
        </div>
      ))}
    </>
  );
}

export function BriefDialog({
  triggerClassName,
  label = "Brief with Friend",
}: {
  triggerClassName?: string;
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      aria-haspopup="dialog"
      onClick={() => requestBrief()}
      className={cn(
        "h-auto rounded-none px-0 font-mono text-[12px] text-foreground hover:bg-transparent hover:text-ice",
        triggerClassName,
      )}
    >
      <ScrambleText text={label} />
    </Button>
  );
}

export function BriefGate() {
  const pathname = usePathname();
  if (pathname === "/contacts") return null;
  return <BriefDialogHost />;
}

export function BriefDialogHost({ embedded = false }: { embedded?: boolean }) {
  const store = useSyncExternalStore(subscribe, readStore, () => EMPTY_STORE);
  const history = store.history;
  const [live, setLive] = useState<Conversation>(emptyConversation);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Panel>("live");
  const [pastId, setPastId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<DraftFile[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognizer | null>(null);
  const voiceBase = useRef("");
  const suggestion = useRef(0);
  const filesRef = useRef(files);
  filesRef.current = files;
  const steps = useRef<Conversation[]>([]);
  const continued = useRef("");
  const typedPlaceholder = useTypedPlaceholder(!draft && !listening);
  const past = history.find((item) => item.id === pastId) ?? null;
  const showingList = view === "list" || (view === "past" && !past);
  const reading = view === "past" && past ? past : null;
  const showGreeting = view === "live" && live.messages.length === 0;

  const onOpenChangeRef = useRef<(next: boolean) => void>(() => {});

  useEffect(() => {
    if (embedded) return;
    const openNow = () => onOpenChangeRef.current(true);
    openListeners.add(openNow);
    return () => {
      openListeners.delete(openNow);
    };
  }, [embedded]);

  useEffect(() => {
    const onService = (event: Event) => {
      const detail = (event as CustomEvent<{ service?: string }>).detail;
      const service = typeof detail?.service === "string" ? detail.service.trim() : "";
      if (!service) return;
      if (!embedded) onOpenChangeRef.current(true);
      epoch += 1;
      archivedSignature = "";
      publish({
        ...emptyConversation(),
        flow: "service",
        path: "order",
        task: service,
        pending: "service",
        messages: [
          {
            id: makeId(),
            role: "bot",
            text: `You wanted to order ${service}. Let me tell you more about what we can do.`,
            files: [],
            mood: "happy",
          },
        ],
      });
      steps.current = [];
      continued.current = "";
      syncBack();
      setView("live");
      setPastId(null);
      setDraft("");
      setError("");
      setThinking(false);
      setSending(false);
      setMascotMood("happy");
    };
    window.addEventListener("uix-open-brief", onService);
    return () => window.removeEventListener("uix-open-brief", onService);
  }, [embedded]);

  useEffect(() => {
    const persist = () => archiveSnapshot();
    window.addEventListener("pagehide", persist);
    return () => {
      window.removeEventListener("pagehide", persist);
      archiveSnapshot();
      openConversation = emptyConversation();
      archivedSignature = "";
      dialogOpen = false;
      publishBriefOpen();
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const next = JSON.stringify({ current: null, history: readStore().history });
      if (raw !== next) writeStore(readStore().history);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [live, view, pastId, history]);

  useEffect(() => {
    if (!embedded) return;
    setMascotMood("listen");
  }, [embedded]);

  function publish(next: Conversation) {
    openConversation = next;
    setLive(next);
  }

  function clearDraftFiles() {
    setFiles((current) => {
      revokeFiles(current);
      return [];
    });
  }

  function stopVoice() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }

  function syncBack() {
    setBriefBack({
      canBack: steps.current.length > 0,
      back: () => goBack(),
    });
  }

  function goBack() {
    const prev = steps.current.pop();
    if (prev?.pending === "service") continued.current = "";
    syncBack();
    if (!prev) return;
    epoch += 1;
    stopSpeech();
    publish(prev);
    setDraft("");
    setError("");
    setThinking(false);
    setSending(false);
    const mood = [...prev.messages].reverse().find((message) => message.role === "bot")?.mood;
    setMascotMood(mood ?? "listen");
  }

  function continueService() {
    const base = openConversation;
    if (base.pending !== "service") return;
    const intro = base.messages[base.messages.length - 1];
    if (!intro || continued.current === intro.id) return;
    continued.current = intro.id;
    const named = base.task || intro.text.match(/order (.+?)\. Let me tell you more/)?.[1] || "";
    const estimates = estimateFromText(named);
    const text = estimates.length ? `${formatEstimate(estimates)} When do you need it?` : "When do you need it?";
    const mood: MascotMood = estimates.length ? "surprised" : "listen";
    setMascotMood(mood);
    publish({
      ...base,
      task: named,
      pending: "deadline",
      messages: [...base.messages, { id: makeId(), role: "bot", text, files: [], mood }],
    });
  }

  function beginNew() {
    archiveSnapshot();
    epoch += 1;
    archivedSignature = "";
    steps.current = [];
    continued.current = "";
    syncBack();
    stopSpeech();
    publish(embedded ? emptyConversation() : chatConversation());
    setView("live");
    setPastId(null);
    setDraft("");
    clearDraftFiles();
    stopVoice();
    setError("");
    setSending(false);
    setThinking(false);
    setMascotMood("listen");
  }

  function openThread(id: string) {
    setPastId(id);
    setView("past");
    setDraft("");
    clearDraftFiles();
    stopVoice();
    setError("");
  }

  function onOpenChange(next: boolean) {
    if (next) {
      if (!dialogOpen) {
        epoch += 1;
        archivedSignature = "";
        publish(chatConversation());
        steps.current = [];
        continued.current = "";
        syncBack();
        stopSpeech();
        setView("live");
        setPastId(null);
        setDraft("");
        clearDraftFiles();
        stopVoice();
        setError("");
        setSending(false);
        setThinking(false);
        setMascotMood("listen");
      }
    } else if (dialogOpen) {
      archiveSnapshot();
      epoch += 1;
      stopVoice();
    }
    dialogOpen = next;
    publishBriefOpen();
    setOpen(next);
  }

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      revokeFiles(filesRef.current);
    };
  }, []);

  function addFiles(list: FileList | null) {
    const picked = Array.from(list ?? []);
    if (!picked.length) return;
    setFiles((current) => [
      ...current,
      ...picked.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      })),
    ]);
    setError("");
  }

  function removeFile(id: string) {
    setFiles((current) => {
      const found = current.find((file) => file.id === id);
      if (found?.preview) URL.revokeObjectURL(found.preview);
      return current.filter((file) => file.id !== id);
    });
  }

  function suggestPrompt() {
    const line = placeholderLines[suggestion.current % placeholderLines.length];
    suggestion.current += 1;
    setDraft(line);
    setError("");
  }

  function toggleVoice() {
    if (listening) {
      stopVoice();
      return;
    }
    const recognition = createRecognizer();
    if (!recognition) {
      setError("Voice input needs a browser that can hear you.");
      return;
    }
    voiceBase.current = draft.trim() ? `${draft.trim()} ` : "";
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let spoken = "";
      for (let index = 0; index < event.results.length; index += 1) {
        spoken += event.results[index][0].transcript;
      }
      setDraft(`${voiceBase.current}${spoken}`.replace(/\s+/g, " ").trimStart());
      setError("");
    };
    recognition.onerror = (event) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      if (event.error === "not-allowed") {
        setError("Allow the microphone to dictate.");
      } else {
        setError("Voice input stopped.");
      }
      setListening(false);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };
    recognitionRef.current = recognition;
    setListening(true);
    setError("");
    try {
      recognition.start();
    } catch {
      setListening(false);
      setError("Voice input stopped.");
    }
  }

  useEffect(() => {
    syncBack();
    return () => setBriefBack({ canBack: false, back: () => {} });
  }, [embedded]);

  async function sendChat(base: Conversation, trimmed: string, nextFiles: string[]) {
    const started = epoch;
    const looksLikeWork = estimateFromText(trimmed).length > 0;
    let name = nameFrom(trimmed) ?? base.name;
    let deadline = deadlineFrom(trimmed) ?? base.deadline;
    let budget = budgetFrom(trimmed) ?? base.budget;
    let task = base.task;
    if (base.pending && trimmed && !looksLikeWork) {
      if (base.pending === "name") name = trimmed;
      if (base.pending === "deadline") deadline = trimmed;
      if (base.pending === "budget") budget = trimmed;
    } else if (trimmed) {
      task = [task, trimmed].filter(Boolean).join("\n");
    }
    const scripted = replyFor({ name, task, deadline, budget, files: nextFiles });
    const stamp = base.messages.length + 1;
    const userMessage: ChatMessage = { id: `${stamp}-u`, role: "user", text: trimmed, files: nextFiles };
    const optimistic: Conversation = {
      ...base,
      flow: "chat",
      messages: [...base.messages, userMessage],
      name,
      task,
      deadline,
      budget,
      pending: scripted.pending,
      received: scripted.received,
      receivedAt: scripted.received ? new Date().toISOString() : base.receivedAt,
    };
    publish(optimistic);
    setDraft("");
    clearDraftFiles();
    stopVoice();
    setError("");
    setSending(true);
    setMascotMood(scripted.mood);
    let answer = scripted.text;
    try {
      const response = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          files: nextFiles,
          history: base.messages.map((message) => ({ role: message.role, text: message.text })),
        }),
      });
      const payload = (await response.json()) as { source?: string; text?: string };
      if (payload.source === "gemini" && payload.text) {
        const clean = stripHourlyRates(payload.text);
        const hourly = /\d+\s*h\s*[×x*]\s*\$[\d,]+/i.test(clean);
        if (clean && !hourly && (clean.includes("Rough total") || !scripted.text.includes("Rough total"))) {
          answer = scripted.received ? `${clean} Request received. Saved in this browser.` : clean;
        }
      }
    } catch {
      answer = scripted.text;
    }
    const reply: ChatMessage = { id: `${stamp}-b`, role: "bot", text: answer, files: [], mood: scripted.mood };
    if (started !== epoch) {
      appendArchivedReply(optimistic, reply);
      setSending(false);
      return;
    }
    publish({ ...optimistic, messages: [...optimistic.messages, reply] });
    setSending(false);
  }

  async function send(text: string, nextFiles: string[] = []) {
    const trimmed = text.trim();
    if ((!trimmed && nextFiles.length === 0) || thinking || view !== "live") {
      if (!trimmed && nextFiles.length === 0) setError("Add a message or a file.");
      return;
    }
    const base = openConversation;
    if (base.flow === "chat") {
      await sendChat(base, trimmed, nextFiles);
      return;
    }
    const beat = applyAnswer(base, trimmed);
    if (!beat) return;
    const started = epoch;
    const stamp = base.messages.length + 1;
    const userMessage: ChatMessage = { id: `${stamp}-u`, role: "user", text: trimmed, files: [] };
    steps.current.push(cloneConversation(base));
    syncBack();
    publish({ ...base, messages: [...base.messages, userMessage] });
    setDraft("");
    clearDraftFiles();
    stopVoice();
    setError("");
    setThinking(true);
    setMascotMood("focus");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    await new Promise((resolve) => window.setTimeout(resolve, reduced ? 0 : 880));
    if (started !== epoch) {
      setThinking(false);
      return;
    }
    const reply: ChatMessage = {
      id: `${stamp}-b`,
      role: "bot",
      text: beat.text,
      files: [],
      mood: beat.mood,
    };
    setMascotMood(beat.mood);
    publish({
      ...base,
      ...beat.patch,
      messages: [...base.messages, userMessage, reply],
    });
    setThinking(false);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(
      draft,
      files.map((file) => file.name),
    );
  }

  const spoken = (
    <SpokenBrief
      live={reading ?? live}
      thinking={thinking || view !== "live"}
      draft={draft}
      error={error}
      onDraft={(value) => {
        setDraft(value);
        if (error) setError("");
      }}
      onSend={(text) => {
        void send(text, []);
      }}
      onRestart={beginNew}
      onContinue={() => {
        continueService();
      }}
      voice={embedded}
    />
  );

  if (embedded) {
    return (
      <section className="relative z-10 flex min-w-0 flex-col justify-center px-4 py-8 sm:px-8 lg:px-12">
        {spoken}
      </section>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(52rem,calc(100dvh-1.5rem))] w-[min(72rem,calc(100vw-1.5rem))] max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-none">
        <div data-lenis-prevent className="flex h-full min-h-0 flex-col bg-[#0a0a0b] text-foreground">
          <div className="flex items-center gap-2 px-4 pt-4">
            <button
              type="button"
              aria-label="History"
              aria-pressed={showingList}
              onClick={() => {
                setView(showingList ? "live" : "list");
                setError("");
              }}
              className={cn(
                "inline-flex size-9 items-center justify-center text-foreground hover:text-ice",
                showingList && "text-ice",
              )}
            >
              <History className="size-5" aria-hidden />
            </button>
            <a href={`mailto:${STUDIO_MAIL}`} className="font-mono text-[12px] text-foreground hover:text-ice">
              {STUDIO_MAIL}
            </a>
          </div>
          <DialogHeader className="sr-only">
            <DialogTitle>Brief with Friend</DialogTitle>
            <DialogDescription>A brief in this browser.</DialogDescription>
          </DialogHeader>
          {showingList ? (
            <div className="flex flex-col gap-2 overflow-y-auto px-6 py-6 sm:px-24">
              <button type="button" className="border border-white/15 px-3 py-2 text-left font-mono text-[12px] text-foreground hover:text-ice" onClick={beginNew}>
                New dialog
              </button>
              {history.length ? (
                history.map((thread) => (
                  <button key={thread.id} type="button" className="border border-white/10 px-3 py-2 text-left hover:border-white/30" onClick={() => openThread(thread.id)}>
                    <span className="block font-sans text-[13px] text-foreground">{thread.title}</span>
                    <span className="mt-1 block font-mono text-[12px] text-quiet">
                      {[formatWhen(thread.archivedAt), `${thread.messages.length} messages`].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                ))
              ) : (
                <p className="font-sans text-sm text-quiet">No past dialogs yet.</p>
              )}
            </div>
          ) : reading ? (
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-8 sm:px-24">
              <Transcript messages={reading.messages} instant />
              <Button type="button" variant="outline" className="h-8 w-fit rounded-none border-white/15 bg-transparent px-3 font-mono text-[12px]" onClick={beginNew}>
                New dialog
              </Button>
            </div>
          ) : live.flow === "service" ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-6 py-10">
              <DialogMascot className="h-52 w-52 sm:h-64 sm:w-64" />
              {spoken}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              {showGreeting ? (
                <div className="flex shrink-0 flex-col items-center gap-5 px-6 pt-6 sm:px-24">
                  <DialogMascot className="size-32 sm:size-40" />
                  <div className="flex max-w-xl flex-col items-center gap-3">
                    <p className="text-center font-sans text-4xl leading-[1.05] text-foreground sm:text-5xl">
                      How can I help you today?
                    </p>
                    <p className="text-center font-sans text-[15px] leading-[1.45] text-foreground/70">
                      I can guide you around the site, answer questions about the work, price a project or design support, and suggest where to start.
                    </p>
                  </div>
                </div>
              ) : (
                <div data-lenis-prevent className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 pt-4 pb-3 sm:px-24">
                  <Transcript messages={live.messages} instant={false} />
                  <div ref={end} />
                </div>
              )}
              {live.received ? (
                <div className="flex flex-col gap-3 border-t border-white/10 px-6 py-4 sm:px-24">
                  <p className="font-sans text-sm">Proposal ready.</p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" className="h-8 rounded-none bg-foreground px-3 font-mono text-[12px] text-background hover:bg-ice hover:text-background" onClick={() => downloadProposal(live)}>
                      Download proposal
                    </Button>
                    <a href={CALENDLY_URL} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center border border-white/15 px-3 font-mono text-[12px] text-foreground hover:text-ice">
                      Book a call
                    </a>
                    <a href={`mailto:${STUDIO_MAIL}`} className="inline-flex h-8 items-center border border-white/15 px-3 font-mono text-[12px] text-foreground hover:text-ice">
                      {STUDIO_MAIL}
                    </a>
                  </div>
                  <Button type="button" variant="outline" className="h-8 w-fit rounded-none border-white/15 bg-transparent px-3 font-mono text-[12px] text-foreground hover:bg-transparent hover:text-ice" onClick={beginNew}>
                    Write another
                  </Button>
                </div>
              ) : (
                <form onSubmit={onSubmit} className={cn("flex shrink-0 flex-col gap-3 px-6 sm:px-24", showGreeting ? "mt-8 pb-8 sm:mt-12" : "pb-8 sm:pb-10")}>
                  <div className="rounded-2xl border border-white/12 bg-[#141416] px-3 pt-3 pb-2.5">
                    <div className="flex items-center px-1">
                      <span className="inline-flex h-7 items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-2.5 font-mono text-[12px] text-foreground">
                        <span className="size-1.5 rounded-full bg-ice" aria-hidden />
                        Friend
                      </span>
                    </div>
                    {files.length ? (
                      <div className="mt-3 flex flex-wrap gap-2 px-1">
                        {files.map((file) => (
                          <div key={file.id} className="relative size-16 overflow-hidden rounded-xl border border-white/10 bg-white/[0.05]">
                            {file.preview ? (
                              <img src={file.preview} alt="" className="size-full object-cover" />
                            ) : (
                              <span className="flex size-full items-end p-1.5 font-mono text-[10px] leading-tight text-foreground/80">{file.name}</span>
                            )}
                            <button type="button" aria-label={`Remove ${file.name}`} onClick={() => removeFile(file.id)} className="absolute top-1 right-1 inline-flex size-4 items-center justify-center rounded-full bg-black/70 text-foreground">
                              <X className="size-3" aria-hidden />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="relative mt-2">
                      <label className="sr-only" htmlFor="brief-draft">Message</label>
                      <textarea
                        id="brief-draft"
                        rows={3}
                        value={draft}
                        disabled={sending}
                        onChange={(event) => {
                          setDraft(event.target.value);
                          if (error) setError("");
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            event.currentTarget.form?.requestSubmit();
                          }
                        }}
                        placeholder=""
                        aria-invalid={error ? true : undefined}
                        className="min-h-[4.5rem] w-full resize-none border-0 bg-transparent px-1 py-1.5 text-left font-sans text-[15px] leading-[1.45] text-foreground outline-none disabled:opacity-50"
                      />
                      {!draft ? (
                        <span aria-hidden className="pointer-events-none absolute inset-x-1 top-1.5 font-sans text-[15px] leading-[1.45] text-quiet">
                          {listening ? "Listening…" : typedPlaceholder}
                          {listening ? null : <span className="ml-0.5 inline-block h-[1em] w-px translate-y-px bg-foreground/80 align-middle motion-safe:animate-pulse" />}
                        </span>
                      ) : null}
                    </div>
                    <input
                      ref={fileInput}
                      type="file"
                      multiple
                      tabIndex={-1}
                      aria-hidden="true"
                      className="sr-only"
                      onChange={(event) => {
                        addFiles(event.target.files);
                        event.target.value = "";
                      }}
                    />
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-0.5">
                        <button type="button" aria-label="Attach a file" className="inline-flex size-8 items-center justify-center rounded-lg text-foreground/80 hover:bg-white/8 hover:text-foreground" onClick={() => fileInput.current?.click()}>
                          <Plus className="size-4" aria-hidden />
                        </button>
                        <button type="button" aria-label="Suggest a prompt" className="inline-flex size-8 items-center justify-center rounded-lg text-foreground/80 hover:bg-white/8 hover:text-foreground" onClick={suggestPrompt}>
                          <Lightbulb className="size-4" aria-hidden />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button type="button" aria-label={listening ? "Stop voice input" : "Voice input"} aria-pressed={listening} className={cn("inline-flex size-8 items-center justify-center rounded-lg text-foreground/80 hover:bg-white/8 hover:text-foreground", listening && "bg-white/10 text-ice")} onClick={toggleVoice}>
                          <Mic className="size-4" aria-hidden />
                        </button>
                        <button type="submit" aria-label={sending ? "Sending" : "Send"} disabled={sending} className="inline-flex size-8 items-center justify-center rounded-lg bg-foreground text-background hover:bg-ice disabled:opacity-50">
                          <ArrowUp className="size-4" aria-hidden />
                        </button>
                      </div>
                    </div>
                  </div>
                  {error ? <p className="font-mono text-[12px] text-danger">{error}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    {prompts.map((prompt) => (
                      <button key={prompt} type="button" disabled={sending} className="border border-white/15 px-4 py-2.5 font-mono text-[13px] text-foreground hover:text-ice disabled:opacity-50" onClick={() => void send(prompt, [])}>
                        {prompt}
                      </button>
                    ))}
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
