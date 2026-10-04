import { Badge } from "@ctrl-ui/react/ui/badge";
import { Card, CardContent } from "@ctrl-ui/react/ui/card";
import type { ReactNode } from "react";
import { formatTimestamp } from "../lib/status-meta";

export interface Maintenance {
  _id: string;
  affectedMonitors: string[];
  endsAt: number;
  isActive: boolean;
  message?: string;
  startsAt: number;
  title: string;
}

function MaintenanceTime({ timestamp }: { timestamp: number }) {
  return (
    <time dateTime={new Date(timestamp).toISOString()}>
      {formatTimestamp(timestamp)}
    </time>
  );
}

export function MaintenanceList<T extends Maintenance>({
  maintenances,
  renderAction,
}: {
  maintenances: T[];
  renderAction?: (maintenance: T) => ReactNode;
}) {
  if (maintenances.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="scheduled-maintenance" className="space-y-3">
      <h2 className="font-semibold text-heading-4" id="scheduled-maintenance">
        Scheduled maintenance
      </h2>
      {maintenances.map((maintenance) => (
        <Card key={maintenance._id}>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <h3 className="font-semibold text-sm">{maintenance.title}</h3>
                <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
                  <Badge
                    color={maintenance.isActive ? "blue" : "neutral"}
                    size="sm"
                  >
                    {maintenance.isActive ? "In progress" : "Upcoming"}
                  </Badge>
                  <span className="tabular-nums">
                    <MaintenanceTime timestamp={maintenance.startsAt} /> –{" "}
                    <MaintenanceTime timestamp={maintenance.endsAt} />
                  </span>
                </div>
              </div>
              {renderAction?.(maintenance)}
            </div>
            {maintenance.message && (
              <p className="text-pretty text-muted-foreground text-sm">
                {maintenance.message}
              </p>
            )}
            {maintenance.affectedMonitors.length > 0 ? (
              <ul
                aria-label="Affected services"
                className="flex flex-wrap gap-1"
              >
                {maintenance.affectedMonitors.map((name) => (
                  <li key={name}>
                    <Badge size="sm" variant="outline">
                      {name}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-xs">
                Affects all services
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
