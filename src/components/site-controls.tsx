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

  return (
    <div
      data-sound-toggle=""
      role="group"
      aria-label="Sound"
      className={`fixed z-40 flex flex-col gap-2 right-4 sm:right-8 ${clearMascot ? "bottom-32 sm:bottom-40" : "bottom-4"}`}
    >
      <button
        type="button"
        aria-pressed={sound}
        aria-label="Sound on"
        onClick={() => setSoundOn(true)}
        className={`${round} ${sound ? "border-foreground bg-foreground text-background hover:text-background" : ""}`}
      >
        <Volume2 className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-pressed={!sound}
        aria-label="Sound off"
        onClick={() => setSoundOn(false)}
        className={`${round} ${sound ? "" : "border-foreground bg-foreground text-background hover:text-background"}`}
      >
        <VolumeX className="size-4" aria-hidden />
      </button>
    </div>
  );
}
