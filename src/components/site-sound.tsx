"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { armSound, getSoundOn, playClick, stopSpeech } from "@/lib/sound";

export function SiteSound() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/contacts") stopSpeech();
  }, [pathname]);

  useEffect(() => {
    window.speechSynthesis?.getVoices();
    const onVoices = () => {
      window.speechSynthesis?.getVoices();
    };
    window.speechSynthesis?.addEventListener("voiceschanged", onVoices);

    const onClick = (event: MouseEvent) => {
      if (!getSoundOn()) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-sound-toggle]")) return;
      const hit = target.closest("a, button, [role='button']");
      if (!hit || (hit instanceof HTMLButtonElement && hit.disabled)) return;
      playClick(hit.tagName === "A" ? "link" : "button");
    };

    const arm = () => {
      if (getSoundOn()) armSound();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("pointerdown", arm);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pointerdown", arm);
      window.speechSynthesis?.removeEventListener("voiceschanged", onVoices);
    };
  }, []);

  return null;
}
