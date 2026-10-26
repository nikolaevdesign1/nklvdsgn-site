"use client";

import { requestBrief } from "@/components/brief-dialog";

export function DiscussDock({ label }: { label: string }) {
  return (
    <div
      className="fixed bottom-4 left-4 z-40 w-[min(18rem,calc(100vw-2rem))] lg:bottom-[calc(37px+1.75rem)]"
    >
      <button
        type="button"
        onClick={() => requestBrief()}
        className="flex w-full cursor-pointer items-center justify-center bg-foreground px-4 py-2 text-center font-mono text-[12px] leading-5 text-background hover:bg-ice"
        style={{ textAlign: "center" }}
      >
        <span className="block w-full text-center">{label}</span>
      </button>
    </div>
  );
}
