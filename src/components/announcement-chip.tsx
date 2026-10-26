import { announcement } from "@/data/announcement";

export function AnnouncementChip() {
  if (!announcement.text) return null;

  return (
    <div
      data-announcement=""
      className="inline-flex max-w-full items-center justify-center gap-2.5 rounded-full border border-white/20 bg-[#0a0a0b]/72 py-1 pr-3.5 pl-1 text-center backdrop-blur-md max-md:mx-auto"
    >
      <span className="rounded-full bg-foreground px-2 py-1 font-mono text-[10px] leading-none text-background">
        {announcement.badge}
      </span>
      <span className="font-sans text-[13px] leading-none text-foreground">{announcement.text}</span>
    </div>
  );
}
