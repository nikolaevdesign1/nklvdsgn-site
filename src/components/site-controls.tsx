"use client";

import { Undo2, Volume2, VolumeX } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { getBriefBack, getBriefBackServer, subscribeBriefBack } from "@/lib/brief-steps";
import { getSoundOn, setSoundOn, subscribeSound } from "@/lib/sound";

const round =
  "inline-flex size-11 items-center justify-center rounded-full border border-white/20 bg-background/40 text-foreground hover:text-ice";

export function BriefBackButton() {
  const back = useSyncExternalStore(subscribeBriefBack, getBriefBack, getBriefBackServer);

  return (
    <button
      type="button"
      data-brief-back=""
      aria-label="Previous answer"
      disabled={!back.canBack}
      onClick={() => back.back()}
      className={`${round} disabled:opacity-40`}
    >
      <Undo2 className="size-4" aria-hidden />
    </button>
  );
}

export function SoundToggle() {
  const pathname = usePathname();
  const sound = useSyncExternalStore(subscribeSound, getSoundOn, () => false);
  const clearMascot = pathname !== "/contacts";
  const slot = "relative z-10 inline-flex size-10 items-center justify-center rounded-full transition-colors duration-300";

  return (
    <div
      data-sound-toggle=""
      role="group"
      aria-label="Sound"
      className={`fixed z-40 right-4 sm:right-8 ${clearMascot ? "bottom-32 sm:bottom-40" : "bottom-4"}`}
    >
      <div className="relative flex w-12 flex-col items-center gap-1 rounded-full border border-white/15 bg-black p-1">
        <span
          aria-hidden
          className="absolute top-1 left-1 size-10 rounded-full bg-foreground transition-transform duration-500 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none"
          style={{ transform: sound ? "translateY(0)" : "translateY(2.75rem)" }}
        />
        <button
          type="button"
          aria-pressed={sound}
          aria-label="Sound on"
          onClick={() => setSoundOn(true)}
          className={`${slot} ${sound ? "text-background" : "text-foreground/70 hover:text-foreground"}`}
        >
          <Volume2 className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          aria-pressed={!sound}
          aria-label="Sound off"
          onClick={() => setSoundOn(false)}
          className={`${slot} ${sound ? "text-foreground/70 hover:text-foreground" : "text-background"}`}
        >
          <VolumeX className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
