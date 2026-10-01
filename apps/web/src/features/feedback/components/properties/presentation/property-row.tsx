import type { ReactNode } from "react";

export type FeedbackPropertiesLayout = "bar" | "panel";

export function PropertyRow({
  label,
  children,
  layout = "bar",
}: {
  label: string;
  children: ReactNode;
  layout?: FeedbackPropertiesLayout;
}) {
  if (layout === "bar") {
    return children;
  }
  return (
    <fieldset
      aria-label={label}
      className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 py-2"
    >
      <span
        aria-hidden
        className="w-20 shrink-0 text-label text-muted-foreground"
      >
        {label}
      </span>
      <div className="flex min-w-0 flex-1 basis-48 flex-wrap items-center gap-1.5 [&_[data-property-label]]:hidden">
        {children}
      </div>
    </fieldset>
  );
}
