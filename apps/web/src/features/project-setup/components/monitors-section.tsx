import { Heartbeat } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { SuggestedMonitor } from "@/features/project-setup/components/review-types";

interface MonitorsSectionProps {
  monitors: SuggestedMonitor[];
  onToggle: (index: number) => void;
  onToggleAll: (accepted: boolean) => void;
}

export function MonitorsSection({
  monitors,
  onToggle,
  onToggleAll,
}: MonitorsSectionProps) {
  if (monitors.length === 0) {
    return null;
  }

  const acceptedCount = monitors.filter((m) => m.accepted).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Heartbeat className="size-4" />
            Status Monitors ({monitors.length} discovered)
          </CardTitle>
          <Button
            onClick={() => onToggleAll(acceptedCount < monitors.length)}
            size="sm"
            variant="ghost"
          >
            {acceptedCount === monitors.length ? "Deselect all" : "Select all"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {monitors.map((monitor, index) => (
            <div
              className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50"
              key={monitor.url}
            >
              <Checkbox
                checked={monitor.accepted}
                onCheckedChange={() => onToggle(index)}
              />
              <code className="flex-1 rounded bg-muted px-2 py-0.5 font-mono text-xs">
                {monitor.url}
              </code>
              <span className="text-muted-foreground text-sm">
                {monitor.name}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
