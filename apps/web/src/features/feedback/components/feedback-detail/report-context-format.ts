import type { Doc } from "@reflet/backend/convex/_generated/dataModel";

export type ReportContextValue = NonNullable<Doc<"feedback">["context"]>;

export function describeEnvironment(
  context: ReportContextValue
): string | null {
  const parts = [context.browser, context.os, context.device].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function describeViewport(context: ReportContextValue): string | null {
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

function fenceSafe(value: string): string {
  return value.replace(FENCE, "`");
}

export type ElementSelectionValue = NonNullable<
  ReportContextValue["selections"]
>[number];

export function reportContextSelections(
  context: ReportContextValue
): ElementSelectionValue[] {
  return context.selections ?? [];
}

function formatSelection(selection: ElementSelectionValue) {
  const lines = [`- **Element:** ${selection.label}`];

  if (selection.comment) {
    lines.push(`- **Reporter note:** ${fenceSafe(selection.comment)}`);
  }
  if (selection.text) {
    lines.push(`- **Text:** ${fenceSafe(selection.text)}`);
  }

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

  const { scroll } = context;
  if (scroll && (scroll.x !== 0 || scroll.y !== 0)) {
    lines.push(`- **Scroll:** ${scroll.x}, ${scroll.y}px`);
  }

  for (const selection of reportContextSelections(context)) {
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
