"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Browser, Crosshair, Monitor, Warning } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  describeEnvironment,
  describeViewport,
  reportContextSelections,
} from "./report-context-format";

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{value}</span>
    </div>
  );
}

export function ReportContext({ feedbackId }: { feedbackId: Id<"feedback"> }) {
  const feedback = useQuery(api.feedback.queries.get, { id: feedbackId });
  const context = feedback?.context;

  if (!context) {
    return null;
  }

  const environment = describeEnvironment(context);
  const viewport = describeViewport(context);
  const selections = reportContextSelections(context);
  const consoleEvents = context.consoleEvents ?? [];

  return (
    <section className="space-y-3">
      <h3 className="font-medium text-sm">Report context</h3>

      <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
        {context.url && (
          <Row
            icon={<Browser className="h-4 w-4" />}
            label="URL"
            value={
              <a
                className="underline underline-offset-2"
                href={context.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {context.url}
              </a>
            }
          />
        )}

        {environment && (
          <Row
            icon={<Monitor className="h-4 w-4" />}
            label="Environment"
            value={
              <span>
                {environment}
                {viewport ? ` · ${viewport}` : ""}
              </span>
            }
          />
        )}

        {selections.map((selection) => (
          <Row
            icon={<Crosshair className="h-4 w-4" />}
            key={`${selection.selector}@${selection.rect.x},${selection.rect.y}`}
            label="Element"
            value={
              <div className="flex min-w-0 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  {selection.componentStack[0] && (
                    <Badge>{`<${selection.componentStack[0]}>`}</Badge>
                  )}
                  <span>{selection.label}</span>
                </span>
                {selection.comment && (
                  <span className="text-foreground">{selection.comment}</span>
                )}
                {selection.region && (
                  <span className="text-muted-foreground text-xs">
                    {selection.region}
                  </span>
                )}
                <code className="w-fit max-w-full truncate rounded bg-background px-1 py-0.5 text-xs">
                  {selection.sourceLocation ?? selection.selector}
                </code>
              </div>
            }
          />
        ))}

        {consoleEvents.length > 0 && (
          <Row
            icon={<Warning className="h-4 w-4" />}
            label="Console"
            value={
              <details>
                <summary className="cursor-pointer text-muted-foreground">
                  {consoleEvents.length} message
                  {consoleEvents.length > 1 ? "s" : ""}
                </summary>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-background p-2 text-xs">
                  {consoleEvents
                    .map((event) => `[${event.level}] ${event.message}`)
                    .join("\n")}
                </pre>
              </details>
            }
          />
        )}
      </div>
    </section>
  );
}
