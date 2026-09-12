import { cn } from "@/lib/utils";

export function RefletMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("reflet-mark", className)}
      fill="none"
      viewBox="0 0 40 40"
    >
      <g stroke="currentColor" strokeLinecap="round" strokeWidth="4.5">
        <path d="M17 6.3a14 14 0 0 0 0 27.4" />
        <path d="M23 6.3a14 14 0 0 1 0 27.4" />
      </g>
    </svg>
  );
}
