"use client";

import { useEffect, useRef, useState } from "react";

const digits = "0123456789";

type TimerRef = { current: number | null };
type GenRef = { current: number };

function clearTimer(timer: TimerRef) {
  if (timer.current !== null) {
    window.clearTimeout(timer.current);
    timer.current = null;
  }
}

function scrambleTo(source: string, frame: number, step: number) {
  return source
    .split("")
    .map((character, index) => {
      if (character === " ") return " ";
      if (frame > index * step + 3) return character;
      return digits[Math.floor(Math.random() * digits.length)];
    })
    .join("");
}

function playScramble(
  source: string,
  timer: TimerRef,
  generation: GenRef,
  setShown: (value: string) => void,
  step = 2,
) {
  clearTimer(timer);
  const id = ++generation.current;
  let frame = 0;
  const limit = step === 0 ? 10 : source.length * step + 6;
  const tick = () => {
    if (id !== generation.current) return;
    frame += 1;
    if (frame >= limit) {
      timer.current = null;
      setShown(source);
      return;
    }
    setShown(scrambleTo(source, frame, step));
    timer.current = window.setTimeout(tick, 18);
  };
  tick();
}

function stopScramble(
  source: string,
  timer: TimerRef,
  generation: GenRef,
  setShown: (value: string) => void,
) {
  generation.current += 1;
  clearTimer(timer);
  setShown(source);
}

export function ScrambleText({
  text,
  className,
  active,
  step = 2,
}: {
  text: string;
  className?: string;
  active?: boolean;
  step?: number;
}) {
  const [shown, setShown] = useState(text);
  const timer = useRef<number | null>(null);
  const generation = useRef(0);

  useEffect(() => {
    if (active === true) playScramble(text, timer, generation, setShown, step);
    else stopScramble(text, timer, generation, setShown);
    return () => {
      generation.current += 1;
      clearTimer(timer);
    };
  }, [active, step, text]);

  return (
    <span
      className={className}
      onMouseEnter={() => {
        if (active !== undefined) return;
        playScramble(text, timer, generation, setShown);
      }}
      onMouseLeave={() => {
        if (active !== undefined) return;
        stopScramble(text, timer, generation, setShown);
      }}
    >
      {shown}
    </span>
  );
}
