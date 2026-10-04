import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

interface AnalyticsCardTitleProps {
  action?: ReactNode;
  children: ReactNode;
  icon: Icon;
  id?: string;
}

export function AnalyticsCardTitle({
  action,
  children,
  icon: TitleIcon,
  id,
}: AnalyticsCardTitleProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="flex min-w-0 items-center gap-2.5 font-medium" id={id}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <TitleIcon aria-hidden className="size-4 text-muted-foreground" />
        </span>
        <span className="truncate">{children}</span>
      </h3>
      {action}
    </div>
  );
}
