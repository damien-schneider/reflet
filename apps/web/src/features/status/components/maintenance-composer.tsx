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
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { Textarea } from "@ctrl-ui/react/ui/textarea";
import { toast } from "@ctrl-ui/react/ui/toast";
import { Toggle } from "@ctrl-ui/react/ui/toggle";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { addHours, format } from "date-fns";
import { type FormEvent, useId, useState } from "react";

interface Monitor {
  _id: Id<"statusMonitors">;
  name: string;
}

interface MaintenanceComposerProps {
  monitors: Monitor[];
  onCancel: () => void;
  onSubmit: (data: {
    affectedMonitorIds: Id<"statusMonitors">[];
    endsAt: number;
    message?: string;
    startsAt: number;
    title: string;
  }) => Promise<void>;
}

const DATETIME_LOCAL_FORMAT = "yyyy-MM-dd'T'HH:mm";

export function MaintenanceComposer({
  monitors,
  onCancel,
  onSubmit,
}: MaintenanceComposerProps) {
  const [title, setTitle] = useState("");
  const [selectedMonitors, setSelectedMonitors] = useState<
    Set<Id<"statusMonitors">>
  >(new Set());
  const [startsAt, setStartsAt] = useState(() =>
    format(new Date(), DATETIME_LOCAL_FORMAT)
  );
  const [endsAt, setEndsAt] = useState(() =>
    format(addHours(new Date(), 1), DATETIME_LOCAL_FORMAT)
  );
  const [message, setMessage] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);
  const messageId = useId();

  const startsAtMs = new Date(startsAt).getTime();
  const endsAtMs = new Date(endsAt).getTime();
  const endsAfterStart = endsAtMs > startsAtMs;
  const canSchedule = title.trim() !== "" && endsAfterStart;

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
    if (!canSchedule || isScheduling) {
      return;
    }
    setIsScheduling(true);
    try {
      await onSubmit({
        affectedMonitorIds: [...selectedMonitors],
        endsAt: endsAtMs,
        message: message.trim() || undefined,
        startsAt: startsAtMs,
        title: title.trim(),
      });
    } catch {
      toast.error("Couldn’t schedule the maintenance. Try again.");
    }
    setIsScheduling(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule maintenance</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field>
            <FieldLabel>Title</FieldLabel>
            <Input
              autoFocus
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Database upgrade"
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
            <FieldDescription>
              Leave empty when the maintenance affects every service.
            </FieldDescription>
          </FieldSet>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Starts</FieldLabel>
              <Input
                className="tabular-nums"
                onChange={(e) => setStartsAt(e.target.value)}
                required
                type="datetime-local"
                value={startsAt}
              />
            </Field>
            <Field>
              <FieldLabel>Ends</FieldLabel>
              <Input
                aria-invalid={!endsAfterStart}
                className="tabular-nums"
                onChange={(e) => setEndsAt(e.target.value)}
                required
                type="datetime-local"
                value={endsAt}
              />
              {!endsAfterStart && (
                <FieldDescription className="text-destructive-text">
                  The end must come after the start.
                </FieldDescription>
              )}
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor={messageId}>
              Message for your users (optional)
            </FieldLabel>
            <Textarea
              id={messageId}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="We’re upgrading our database. The API may be briefly unavailable."
              rows={3}
              value={message}
            />
          </Field>

          <div className="flex items-center justify-end gap-2">
            <Button onClick={onCancel} size="sm" variant="ghost">
              Cancel
            </Button>
            <Button
              disabled={!canSchedule || isScheduling}
              size="sm"
              tone="primary"
              type="submit"
              variant="solid"
            >
              {isScheduling ? "Scheduling…" : "Schedule maintenance"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
