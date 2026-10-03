import { cn } from "@ctrl-ui/react/lib/cn";
import { CircleAlert, CircleCheck, Info, Lightbulb } from "lucide-react";
import type { ReactNode } from "react";

type CalloutType = "info" | "tip" | "warning" | "success";

interface CalloutProps {
  children: ReactNode;
  title?: string;
  type?: CalloutType;
}

const CALLOUT_STYLES: Record<
  CalloutType,
  { icon: typeof Info; iconClassName: string; surface: string; title: string }
> = {
  info: {
    icon: Info,
    iconClassName: "text-muted-foreground",
    surface: "bg-secondary",
    title: "Note",
  },
  success: {
    icon: CircleCheck,
    iconClassName: "text-success-text",
    surface: "bg-success-subtle",
    title: "Good to know",
  },
  tip: {
    icon: Lightbulb,
    iconClassName: "text-(--marketing-signal)",
    surface: "bg-(--marketing-signal-soft)",
    title: "Tip",
  },
  warning: {
    icon: CircleAlert,
    iconClassName: "text-warning-text",
    surface: "bg-warning-subtle",
    title: "Watch out",
  },
};

export function Callout({ type = "info", title, children }: CalloutProps) {
  const style = CALLOUT_STYLES[type];
  const Icon = style.icon;

  return (
    <aside
      className={cn(
        "my-8 flex gap-3 rounded-(--radius-panel) p-5",
        style.surface
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn("mt-1 size-4 shrink-0", style.iconClassName)}
      />
      <div className="min-w-0 text-body-lg text-muted-foreground leading-relaxed [&_p:last-child]:mb-0 [&_ul:last-child]:mb-0">
        <p className="mb-1 font-semibold text-body-lg text-foreground">
          {title ?? style.title}
        </p>
        {children}
      </div>
    </aside>
  );
}
