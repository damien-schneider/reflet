"use client";

import { Browser, Crosshair, Monitor, Warning } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";

import { Badge } from "@/components/ui/badge";

export type ReportContextValue = NonNullable<Doc<"feedback">["context"]>;

function describeEnvironment(context: ReportContextValue): string | null {
  const parts = [context.browser, context.os, context.device].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function describeViewport(context: ReportContextValue): string | null {
  const { viewport } = context;
  if (!viewport) {
    return null;
  }
  const ratio =
    viewport.devicePixelRatio && viewport.devicePixelRatio !== 1
      ? ` @${viewport.devicePixelRatio}x`
      : "";
  return `${viewport.width}×${viewport.height}${ratio}`;
}

const FENCE = /`{3,}/g;

/** Page content lands inside a fenced block — it must not be able to close it. */
function fenceSafe(value: string): string {
  return value.replace(FENCE, "`");
}

function formatSelection(
  selection: NonNullable<ReportContextValue["selection"]>
) {
  const lines = [`- **Element:** ${selection.label}`];
  const [component] = selection.componentStack;

  if (component) {
    lines.push(`- **Component:** \`<${component}>\``);
  }
  if (selection.region) {
    lines.push(`- **Region:** ${selection.region}`);
  }
  if (selection.sourceLocation) {
    lines.push(`- **Source:** \`${selection.sourceLocation}\``);
  }
  if (selection.componentStack.length > 1) {
    lines.push(
      `- **Component stack:** ${selection.componentStack.join(" › ")}`
    );
  }
  lines.push(`- **Selector:** \`${selection.selector}\``);
  lines.push(
    `- **Markup:**\n\n\`\`\`html\n${fenceSafe(selection.html)}\n\`\`\``
  );

  return lines;
}

/**
 * Markdown block handed to coding agents. Keeps only what helps locate the
 * problem — no raw user agent dumps, no empty sections.
 */
export function formatReportContext(context: ReportContextValue): string {
  const lines: string[] = [];

  if (context.url) {
    lines.push(`- **URL:** ${context.url}`);
  }
  if (context.pageTitle) {
    lines.push(`- **Page:** ${context.pageTitle}`);
  }

  const environment = describeEnvironment(context);
  if (environment) {
    lines.push(`- **Environment:** ${environment}`);
  }

  const viewport = describeViewport(context);
  if (viewport) {
    lines.push(`- **Viewport:** ${viewport}`);
  }

  const { selection } = context;
  if (selection) {
    lines.push(...formatSelection(selection));
  }

  const errors = context.consoleEvents ?? [];
  if (errors.length > 0) {
    lines.push(
      `- **Console (${errors.length}):**\n\n\`\`\`\n${fenceSafe(
        errors.map((event) => `[${event.level}] ${event.message}`).join("\n")
      )}\n\`\`\``
    );
  }

  for (const [key, value] of Object.entries(context.metadata ?? {})) {
    lines.push(`- **${key}:** ${value}`);
  }

  return lines.join("\n");
}

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
  const { selection } = context;
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

        {selection && (
          <Row
            icon={<Crosshair className="h-4 w-4" />}
            label="Element"
            value={
              <div className="flex min-w-0 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  {selection.componentStack[0] && (
                    <Badge variant="secondary">
                      {`<${selection.componentStack[0]}>`}
                    </Badge>
                  )}
                  <span>{selection.label}</span>
                </span>
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
        )}

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
