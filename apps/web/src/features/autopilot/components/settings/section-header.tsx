import type { ComponentType } from "react";

import { Badge } from "@/components/ui/badge";

export function SectionHeader({
  icon: Icon,
  title,
  description,
  badge,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-muted p-2">
        <Icon className="size-5 text-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-base tracking-tight">{title}</h3>
          {badge && (
            <Badge
              className="text-[10px] uppercase tracking-wider"
              variant="outline"
            >
              {badge}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  );
}
