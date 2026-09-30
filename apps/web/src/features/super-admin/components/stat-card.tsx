import { Card, CardContent } from "@ctrl-ui/react/ui/card";
import type { Icon } from "@phosphor-icons/react";

interface StatCardProps {
  icon: Icon;
  label: string;
  value: number;
}

const statFormatter = new Intl.NumberFormat("en-US");

export function StatCard({ label, value, icon: IconComponent }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <IconComponent aria-hidden className="size-5 text-muted-foreground" />
        </div>
        <dl className="flex min-w-0 flex-col">
          <dt className="truncate text-caption text-muted-foreground">
            {label}
          </dt>
          <dd className="text-heading-3 tabular-nums">
            {statFormatter.format(value)}
          </dd>
        </dl>
      </CardContent>
    </Card>
  );
}
