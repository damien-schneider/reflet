import type { Icon } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: Icon;
}

export function StatCard({ label, value, icon: IconComponent }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <IconComponent className="size-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-muted-foreground text-xs">{label}</p>
          <p className="font-semibold text-2xl tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
