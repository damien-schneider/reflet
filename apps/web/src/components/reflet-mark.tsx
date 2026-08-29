import { cn } from "@/lib/utils";

const ARC = "M2 11a10 10 0 0 1 20 0";
const CREST = `${ARC}Z`;
const REFLECTION = "M5.2 13.6a6.8 3.4 0 0 0 13.6 0Z";

export function RefletMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("size-6 text-olive-600 dark:text-olive-400", className)}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d={CREST} />
      <path
        className="opacity-55 transition-transform duration-500 ease-out group-hover/mark:translate-y-[0.7px]"
        d={REFLECTION}
      />
    </svg>
  );
}

export function RefletArc({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("w-full text-olive-600 dark:text-olive-200", className)}
      fill="none"
      viewBox="2 1 20 10"
    >
      <path
        d={ARC}
        stroke="currentColor"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function RefletWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "group/mark inline-flex items-center gap-2 font-display text-[22px] text-foreground leading-none tracking-tight",
        className
      )}
    >
      <RefletMark className="size-[21px]" />
      Reflet
    </span>
  );
}
