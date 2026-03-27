"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusDot } from "./status-dot";

interface IncidentUpdate {
  createdAt: number;
  message: string;
  status: string;
}

interface IncidentCardProps {
  incident: {
    _id: Id<"statusIncidents">;
    title: string;
    severity: "minor" | "major" | "critical";
    status: "investigating" | "identified" | "monitoring" | "resolved";
    startedAt: number;
    affectedMonitors: Array<{ name: string }>;
    updates: IncidentUpdate[];
  };
  onPostUpdate: (
    incidentId: Id<"statusIncidents">,
    status: "investigating" | "identified" | "monitoring" | "resolved",
    message: string
  ) => void;
}

const statusOptions = [
  { value: "investigating" as const, label: "Investigating" },
  { value: "identified" as const, label: "Identified" },
  { value: "monitoring" as const, label: "Monitoring" },
  { value: "resolved" as const, label: "Resolved" },
];

const severityColors = {
  minor: "border-amber-300 dark:border-amber-800",
  major: "border-orange-300 dark:border-orange-800",
  critical: "border-red-300 dark:border-red-800",
};

const formatRelativeTime = (timestamp: number): string => {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) {
    return "just now";
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return `${diffHr}h ago`;
  }
  return `${Math.floor(diffHr / 24)}d ago`;
};

export function IncidentCard({ incident, onPostUpdate }: IncidentCardProps) {
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(incident.status);
  const [updateMessage, setUpdateMessage] = useState("");

  const handlePostUpdate = () => {
    if (!updateMessage.trim()) {
      return;
    }
    onPostUpdate(incident._id, updateStatus, updateMessage.trim());
    setUpdateMessage("");
    setShowUpdateForm(false);
  };

  return (
    <div
      className={`rounded-lg border-l-4 bg-card p-4 ${severityColors[incident.severity]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <StatusDot
              status={
                incident.severity === "critical" ? "major_outage" : "degraded"
              }
            />
            <h3 className="font-semibold text-sm">{incident.title}</h3>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className="rounded-full bg-muted px-2 py-0.5 capitalize">
              {incident.severity}
            </span>
            <span className="text-muted-foreground">
              Started {formatRelativeTime(incident.startedAt)}
            </span>
          </div>
        </div>
        <Button
          onClick={() => setShowUpdateForm(!showUpdateForm)}
          size="sm"
          variant="outline"
        >
          Post Update
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {incident.affectedMonitors.map((m) => (
          <span
            className="rounded-full bg-red-50 px-2 py-0.5 text-red-700 text-xs dark:bg-red-950 dark:text-red-300"
            key={m.name}
          >
            {m.name}
          </span>
        ))}
      </div>

      {/* Timeline */}
      <div className="mt-3 space-y-2 border-t pt-3">
        {incident.updates.map((update) => (
          <div
            className="flex gap-3 text-xs"
            key={`${update.createdAt}-${update.status}`}
          >
            <span className="shrink-0 text-muted-foreground">
              {formatRelativeTime(update.createdAt)}
            </span>
            <div>
              <span className="font-medium capitalize">{update.status}</span>
              <span className="text-muted-foreground"> — {update.message}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Inline update form */}
      {showUpdateForm && (
        <div className="mt-3 space-y-2 border-t pt-3">
          <div className="flex gap-1.5">
            {statusOptions.map((opt) => (
              <button
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  updateStatus === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
                key={opt.value}
                onClick={() => setUpdateStatus(opt.value)}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Textarea
            autoFocus
            onChange={(e) => setUpdateMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handlePostUpdate();
              }
            }}
            placeholder="What's the latest?"
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
              disabled={!updateMessage.trim()}
              onClick={handlePostUpdate}
              size="sm"
            >
              Post Update
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
