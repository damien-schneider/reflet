import { Button } from "@ctrl-ui/react/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ctrl-ui/react/ui/card";
import { Checkbox } from "@ctrl-ui/react/ui/checkbox";
import { Heartbeat } from "@phosphor-icons/react";
import { useId } from "react";
import type { SuggestedMonitor } from "./setup-types";

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
  const idPrefix = useId();

  if (monitors.length === 0) {
    return null;
  }

  const acceptedCount = monitors.filter((m) => m.accepted).length;
  const allAccepted = acceptedCount === monitors.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Heartbeat aria-hidden className="size-4" />
              Status monitors
            </CardTitle>
            <CardDescription className="tabular-nums">
              {acceptedCount} of {monitors.length} selected
            </CardDescription>
          </div>
          <Button
            onClick={() => onToggleAll(!allAccepted)}
            size="xs"
            variant="ghost"
          >
            {allAccepted ? "Deselect all" : "Select all"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1">
          {monitors.map((monitor, index) => (
            <li key={monitor.url}>
              <label
                className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted/50"
                htmlFor={`${idPrefix}-${index}`}
              >
                <Checkbox
                  checked={monitor.accepted}
                  id={`${idPrefix}-${index}`}
                  onCheckedChange={() => onToggle(index)}
                />
                <code
                  className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-0.5 font-mono text-xs"
                  title={monitor.url}
                >
                  {monitor.url}
                </code>
                <span className="shrink-0 text-muted-foreground text-sm">
                  {monitor.name}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
