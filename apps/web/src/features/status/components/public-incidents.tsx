import { Badge } from "@ctrl-ui/react/ui/badge";
import { Card, CardContent } from "@ctrl-ui/react/ui/card";
import { CaretRight } from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import {
  formatDuration,
  formatTimestamp,
  SEVERITY_BADGE_COLOR,
} from "../lib/status-meta";

interface IncidentUpdate {
  createdAt: number;
  message: string;
  status: string;
}

type Severity = keyof typeof SEVERITY_BADGE_COLOR;

interface ActiveIncident {
  _id: string;
  affectedMonitors: string[];
  severity: Severity;
  startedAt: number;
  status: string;
  title: string;
  updates: IncidentUpdate[];
}

interface PastIncident {
  _id: string;
  resolvedAt?: number | null;
  severity: Severity;
  startedAt: number;
  title: string;
  updates: IncidentUpdate[];
}

function IncidentTimeline({ updates }: { updates: IncidentUpdate[] }) {
  return (
    <ol className="space-y-2">
      {updates.map((update) => (
        <li
          className="flex gap-3 text-xs"
          key={`${update.createdAt}-${update.status}`}
        >
          <time
            className="w-24 shrink-0 text-muted-foreground tabular-nums"
            dateTime={new Date(update.createdAt).toISOString()}
          >
            {formatTimestamp(update.createdAt)}
          </time>
          <p className="min-w-0 text-pretty">
            <span className="font-medium capitalize">{update.status}</span>
            <span className="text-muted-foreground"> — {update.message}</span>
          </p>
        </li>
      ))}
    </ol>
  );
}

export function ActiveIncidents({
  incidents,
}: {
  incidents: ActiveIncident[];
}) {
  if (incidents.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="active-incidents" className="space-y-3">
      <h2 className="font-semibold text-heading-4" id="active-incidents">
        Active incidents
      </h2>
      {incidents.map((incident) => (
        <Card key={incident._id}>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <h3 className="font-semibold text-sm">{incident.title}</h3>
              <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
                <Badge
                  color={SEVERITY_BADGE_COLOR[incident.severity]}
                  size="sm"
                >
                  <span className="capitalize">{incident.severity}</span>
                </Badge>
                <span className="capitalize">{incident.status}</span>
                <span>
                  Started{" "}
                  <time
                    dateTime={new Date(incident.startedAt).toISOString()}
                    title={new Date(incident.startedAt).toLocaleString()}
                  >
                    {formatDistanceToNow(incident.startedAt, {
                      addSuffix: true,
                    })}
                  </time>
                </span>
              </div>
            </div>
            {incident.affectedMonitors.length > 0 && (
              <ul
                aria-label="Affected services"
                className="flex flex-wrap gap-1"
              >
                {incident.affectedMonitors.map((name) => (
                  <li key={name}>
                    <Badge size="sm" variant="outline">
                      {name}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t pt-3">
              <IncidentTimeline updates={incident.updates} />
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

export function PastIncidents({ incidents }: { incidents: PastIncident[] }) {
  if (incidents.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="past-incidents" className="space-y-3">
      <h2 className="font-semibold text-heading-4" id="past-incidents">
        Past incidents
      </h2>
      <div className="space-y-2">
        {incidents.map((incident) => (
          <details
            className="group rounded-(--radius-panel) border"
            key={incident._id}
          >
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 rounded-(--radius-panel) p-3 text-sm [&::-webkit-details-marker]:hidden">
              <CaretRight
                aria-hidden
                className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-(--duration-fast) ease-(--ease-standard) group-open:rotate-90 motion-reduce:transition-none"
              />
              <span className="min-w-0 flex-1 font-medium">
                {incident.title}
              </span>
              <Badge color={SEVERITY_BADGE_COLOR[incident.severity]} size="sm">
                <span className="capitalize">{incident.severity}</span>
              </Badge>
              <span className="text-muted-foreground text-xs tabular-nums">
                {formatTimestamp(incident.startedAt)} ·{" "}
                {formatDuration(
                  incident.startedAt,
                  incident.resolvedAt ?? undefined
                )}
              </span>
            </summary>
            <div className="border-t p-3">
              <IncidentTimeline updates={incident.updates} />
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
