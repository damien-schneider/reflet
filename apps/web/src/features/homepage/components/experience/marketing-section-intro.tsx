import { cn } from "@ctrl-ui/react/lib/cn";
import type { ReactNode } from "react";

export function MarketingSectionIntro({
  align = "center",
  children,
  kicker,
  title,
}: {
  align?: "center" | "start";
  children: ReactNode;
  kicker: string;
  title: ReactNode;
}) {
  return (
    <div
      className={cn(
        "marketing-section-intro",
        align === "start" && "marketing-intro-left"
      )}
    >
      <span className="marketing-kicker">{kicker}</span>
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}
