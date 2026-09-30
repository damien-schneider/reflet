import type { ReactNode } from "react";

export function MarketingSectionIntro({
  children,
  kicker,
  title,
}: {
  children: ReactNode;
  kicker: string;
  title: ReactNode;
}) {
  return (
    <div className="marketing-section-intro">
      <span className="marketing-kicker">{kicker}</span>
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}
