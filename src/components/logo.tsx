import { cn } from "cn";

const sources = {
  square: "url(/logo-square.svg)",
  wordmark: "url(/logo-wordmark.svg)",
} as const;

export function Logo({
  className,
  variant = "square",
}: {
  className?: string;
  variant?: keyof typeof sources;
}) {
  const src = sources[variant];
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block shrink-0 bg-current",
        variant === "wordmark" && "aspect-[633/459]",
        className,
      )}
      style={{
        maskImage: src,
        WebkitMaskImage: src,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "left top",
        WebkitMaskPosition: "left top",
        maskSize: "contain",
        WebkitMaskSize: "contain",
      }}
    />
  );
}
