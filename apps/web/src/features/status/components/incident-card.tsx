"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import { Card, CardContent } from "@ctrl-ui/react/ui/card";
import { FieldLegend, FieldSet } from "@ctrl-ui/react/ui/field";
import { Textarea } from "@ctrl-ui/react/ui/textarea";
import { toast } from "@ctrl-ui/react/ui/toast";
import { Toggle } from "@ctrl-ui/react/ui/toggle";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { format, formatDistanceToNow } from "date-fns";
import { type FormEvent, useId, useState } from "react";
import { SEVERITY_BADGE_COLOR } from "../lib/status-meta";
import { StatusDot } from "./status-dot";

type IncidentStatus =
  | "investigating"
  | "identified"
  | "monitoring"
  | "resolved";
type IncidentSeverity = "minor" | "major" | "critical";

interface IncidentUpdate {
  createdAt: number;
  message: string;
  status: string;
}

interface IncidentCardProps {
  incident: {
    _id: Id<"statusIncidents">;
    title: string;
    severity: IncidentSeverity;
    status: IncidentStatus;
    startedAt: number;
    affectedMonitors: Array<{ name: string }>;
    updates: IncidentUpdate[];
  };
  onPostUpdate: (
    incidentId: Id<"statusIncidents">,
    status: IncidentStatus,
    message: string
  ) => Promise<void>;
}

const STATUS_OPTIONS: ReadonlyArray<{ label: string; value: IncidentStatus }> =
  [
    { label: "Investigating", value: "investigating" },
    { label: "Identified", value: "identified" },
    { label: "Monitoring", value: "monitoring" },
    { label: "Resolved", value: "resolved" },
  ];

export function IncidentCard({ incident, onPostUpdate }: IncidentCardProps) {
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(incident.status);
  const [updateMessage, setUpdateMessage] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const messageId = useId();

  const postUpdate = async () => {
    const message = updateMessage.trim();
    if (!message || isPosting) {
      return;
    }
    setIsPosting(true);
    try {
      await onPostUpdate(incident._id, updateStatus, message);
      setUpdateMessage("");
      setShowUpdateForm(false);
    } catch {
      toast.error("Couldn’t post the update. Try again.");
    }
    setIsPosting(false);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    postUpdate();
  };

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <StatusDot
                status={
                  incident.severity === "critical" ? "major_outage" : "degraded"
                }
              />
              <h3 className="font-semibold text-sm">{incident.title}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
              <Badge color={SEVERITY_BADGE_COLOR[incident.severity]} size="sm">
                <span className="capitalize">{incident.severity}</span>
              </Badge>
              <span>
                Started{" "}
                <time
                  dateTime={new Date(incident.startedAt).toISOString()}
                  title={format(incident.startedAt, "PPpp")}
                >
                  {formatDistanceToNow(incident.startedAt, { addSuffix: true })}
                </time>
              </span>
            </div>
          </div>
          <Button
            aria-expanded={showUpdateForm}
            onClick={() => setShowUpdateForm(!showUpdateForm)}
            size="sm"
            variant="surface"
          >
            Post update
          </Button>
        </div>

        {incident.affectedMonitors.length > 0 && (
          <ul aria-label="Affected services" className="flex flex-wrap gap-1">
            {incident.affectedMonitors.map((m) => (
              <li key={m.name}>
                <Badge size="sm" variant="outline">
                  {m.name}
                </Badge>
              </li>
            ))}
          </ul>
        )}

        <ol className="space-y-2 border-t pt-3">
          {incident.updates.map((update) => (
            <li
              className="flex gap-3 text-xs"
              key={`${update.createdAt}-${update.status}`}
            >
              <time
                className="w-28 shrink-0 text-muted-foreground tabular-nums"
                dateTime={new Date(update.createdAt).toISOString()}
                title={format(update.createdAt, "PPpp")}
              >
                {formatDistanceToNow(update.createdAt, { addSuffix: true })}
              </time>
              <p className="min-w-0 text-pretty">
                <span className="font-medium capitalize">{update.status}</span>
                <span className="text-muted-foreground">
                  {" "}
                  — {update.message}
                </span>
              </p>
            </li>
          ))}
        </ol>

        {showUpdateForm && (
          <form className="space-y-3 border-t pt-3" onSubmit={handleSubmit}>
            <FieldSet>
              <FieldLegend className="sr-only">New status</FieldLegend>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((opt) => (
                  <Toggle
                    key={opt.value}
                    onPressedChange={() => setUpdateStatus(opt.value)}
                    pressed={updateStatus === opt.value}
                    size="xs"
                    value={opt.value}
                  >
                    {opt.label}
                  </Toggle>
                ))}
              </div>
            </FieldSet>
            <label className="sr-only" htmlFor={messageId}>
              Update message
            </label>
            <Textarea
              autoFocus
              id={messageId}
              onChange={(e) => setUpdateMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  postUpdate();
                }
              }}
              placeholder="What’s the latest?"
              rows={2}
              value={updateMessage}
            />
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setShowUpdateForm(false)}
                size="sm"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                disabled={!updateMessage.trim() || isPosting}
                size="sm"
                tone="primary"
                type="submit"
                variant="solid"
              >
                {isPosting ? "Posting…" : "Post update"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
