"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
    value: "minor" as const,
    label: "Minor",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  },
  {
    value: "major" as const,
    label: "Major",
    color:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  },
  {
    value: "critical" as const,
    label: "Critical",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
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
      title: title.trim(),
      severity,
      affectedMonitorIds: [...selectedMonitors],
      message: message.trim(),
    });
  };

  return (
    <div className="rounded-lg border border-red-200 bg-card p-4 dark:border-red-900">
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
            {monitors.map((m) => (
              <button
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  selectedMonitors.has(m._id)
                    ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                    : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                )}
                key={m._id}
                onClick={() => toggleMonitor(m._id)}
                type="button"
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-muted-foreground text-xs">Severity</p>
          <div className="flex gap-1.5">
            {severityOptions.map((opt) => (
              <button
                className={cn(
                  "rounded-full px-3 py-1 text-xs transition-colors",
                  severity === opt.value
                    ? opt.color
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
                key={opt.value}
                onClick={() => setSeverity(opt.value)}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Textarea
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What do your users need to know?"
          rows={3}
          value={message}
        />

        <div className="flex items-center justify-end gap-2">
          <Button onClick={onCancel} size="sm" variant="ghost">
            Cancel
          </Button>
          <Button
            disabled={
              !(title.trim() && message.trim()) || selectedMonitors.size === 0
            }
            onClick={handleSubmit}
            size="sm"
            variant="destructive"
          >
            Publish Incident
          </Button>
        </div>
      </div>
    </div>
  );
}
