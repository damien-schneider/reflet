"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import { Textarea } from "@ctrl-ui/react/ui/textarea";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Monitor {
  _id: Id<"statusMonitors">;
  name: string;
}

interface IncidentComposerProps {
  monitors: Monitor[];
  onCancel: () => void;
  onSubmit: (data: {
    title: string;
    severity: "minor" | "major" | "critical";
    affectedMonitorIds: Id<"statusMonitors">[];
    message: string;
  }) => void;
}

const severityOptions = [
  {
    color: "bg-warning-subtle text-warning-text",
    label: "Minor",
    value: "minor" as const,
  },
  {
    color: "bg-warning/25 text-warning-text",
    label: "Major",
    value: "major" as const,
  },
  {
    color: "bg-destructive-subtle text-destructive-text",
    label: "Critical",
    value: "critical" as const,
  },
];

export function IncidentComposer({
  monitors,
  onSubmit,
  onCancel,
}: IncidentComposerProps) {
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<"minor" | "major" | "critical">(
    "major"
  );
  const [selectedMonitors, setSelectedMonitors] = useState<
    Set<Id<"statusMonitors">>
  >(new Set());
  const [message, setMessage] = useState("");

  const toggleMonitor = (id: Id<"statusMonitors">) => {
    const next = new Set(selectedMonitors);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedMonitors(next);
  };

  const handleSubmit = () => {
    if (!(title.trim() && message.trim()) || selectedMonitors.size === 0) {
      return;
    }

    onSubmit({
      affectedMonitorIds: [...selectedMonitors],
      message: message.trim(),
      severity,
      title: title.trim(),
    });
  };

  return (
    <div className="rounded-lg border border-destructive/30 bg-card p-4">
      <h3 className="mb-3 font-semibold text-sm">Declare Incident</h3>

      <div className="space-y-3">
        <Input
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's happening?"
          value={title}
        />

        <div>
          <p className="mb-1.5 text-muted-foreground text-xs">
            Affected services
          </p>
          <div className="flex flex-wrap gap-1.5">
            {monitors.map((m) => {
              const selected = selectedMonitors.has(m._id);
              return (
                <Button
                  active={selected}
                  aria-pressed={selected}
                  className={cn(
                    "h-auto rounded-full border px-3 py-1 text-xs",
                    selected
                      ? "border-destructive bg-destructive-subtle text-destructive-text"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  )}
                  key={m._id}
                  onClick={() => toggleMonitor(m._id)}
                  type="button"
                  variant="quiet"
                >
                  {m.name}
                </Button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-muted-foreground text-xs">Severity</p>
          <div className="flex gap-1.5">
            {severityOptions.map((opt) => {
              const selected = severity === opt.value;
              return (
                <Button
                  active={selected}
                  aria-pressed={selected}
                  className={cn(
                    "h-auto rounded-full px-3 py-1 text-xs",
                    selected
                      ? opt.color
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                  key={opt.value}
                  onClick={() => setSeverity(opt.value)}
                  type="button"
                  variant="quiet"
                >
                  {opt.label}
                </Button>
              );
            })}
          </div>
        </div>

        <Textarea
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What do your users need to know?"
          rows={3}
          value={message}
        />

        <div className="flex items-center justify-end gap-2">
          <Button onClick={onCancel} size="xs" variant="ghost">
            Cancel
          </Button>
          <Button
            disabled={
              !(title.trim() && message.trim()) || selectedMonitors.size === 0
            }
            onClick={handleSubmit}
            size="xs"
            tone="danger"
            variant="surface"
          >
            Publish Incident
          </Button>
        </div>
      </div>
    </div>
  );
}
