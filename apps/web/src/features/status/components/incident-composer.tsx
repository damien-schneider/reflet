"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ctrl-ui/react/ui/card";
import {
  Field,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { Textarea } from "@ctrl-ui/react/ui/textarea";
import { toast } from "@ctrl-ui/react/ui/toast";
import { Toggle } from "@ctrl-ui/react/ui/toggle";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { type FormEvent, useId, useState } from "react";

type IncidentSeverity = "minor" | "major" | "critical";

interface Monitor {
  _id: Id<"statusMonitors">;
  name: string;
}

interface IncidentComposerProps {
  monitors: Monitor[];
  onCancel: () => void;
  onSubmit: (data: {
    title: string;
    severity: IncidentSeverity;
    affectedMonitorIds: Id<"statusMonitors">[];
    message: string;
  }) => Promise<void>;
}

const SEVERITY_OPTIONS: ReadonlyArray<{
  label: string;
  value: IncidentSeverity;
}> = [
  { label: "Minor", value: "minor" },
  { label: "Major", value: "major" },
  { label: "Critical", value: "critical" },
];

export function IncidentComposer({
  monitors,
  onSubmit,
  onCancel,
}: IncidentComposerProps) {
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<IncidentSeverity>("major");
  const [selectedMonitors, setSelectedMonitors] = useState<
    Set<Id<"statusMonitors">>
  >(new Set());
  const [message, setMessage] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const messageId = useId();

  const canPublish =
    title.trim() !== "" && message.trim() !== "" && selectedMonitors.size > 0;

  const toggleMonitor = (id: Id<"statusMonitors">) => {
    const next = new Set(selectedMonitors);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedMonitors(next);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canPublish || isPublishing) {
      return;
    }
    setIsPublishing(true);
    try {
      await onSubmit({
        affectedMonitorIds: [...selectedMonitors],
        message: message.trim(),
        severity,
        title: title.trim(),
      });
    } catch {
      toast.error("Couldn’t publish the incident. Try again.");
    }
    setIsPublishing(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report an incident</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field>
            <FieldLabel>Title</FieldLabel>
            <Input
              autoFocus
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Checkout API is returning errors"
              value={title}
            />
          </Field>

          <FieldSet>
            <FieldLegend>Affected services</FieldLegend>
            <div className="flex flex-wrap gap-1.5">
              {monitors.map((m) => (
                <Toggle
                  key={m._id}
                  onPressedChange={() => toggleMonitor(m._id)}
                  pressed={selectedMonitors.has(m._id)}
                  size="xs"
                  value={m._id}
                >
                  {m.name}
                </Toggle>
              ))}
            </div>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Severity</FieldLegend>
            <div className="flex flex-wrap gap-1.5">
              {SEVERITY_OPTIONS.map((opt) => (
                <Toggle
                  key={opt.value}
                  onPressedChange={() => setSeverity(opt.value)}
                  pressed={severity === opt.value}
                  size="xs"
                  value={opt.value}
                >
                  {opt.label}
                </Toggle>
              ))}
            </div>
          </FieldSet>

          <Field>
            <FieldLabel htmlFor={messageId}>Message for your users</FieldLabel>
            <Textarea
              id={messageId}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="We’re investigating elevated error rates and will post an update within 30 minutes."
              rows={3}
              value={message}
            />
          </Field>

          <div className="flex items-center justify-end gap-2">
            <Button onClick={onCancel} size="sm" variant="ghost">
              Cancel
            </Button>
            <Button
              disabled={!canPublish || isPublishing}
              size="sm"
              tone="primary"
              type="submit"
              variant="solid"
            >
              {isPublishing ? "Publishing…" : "Publish incident"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
