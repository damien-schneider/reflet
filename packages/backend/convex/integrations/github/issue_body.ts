import type { Doc } from "../../_generated/dataModel";

const MAX_CONSOLE_ERRORS = 10;
const FEEDBACK_MARKER_REGEX = /reflet:([a-z0-9]{32})/;

export interface IssueScreenshot {
  filename: string;
  url: string | null;
}

export function feedbackIdFromIssueBody(
  body: string | undefined
): string | undefined {
  return body ? FEEDBACK_MARKER_REGEX.exec(body)?.[1] : undefined;
}

function reportContextLines(context: Doc<"feedback">["context"]): string[] {
  if (!context) {
    return [];
  }
  const lines: string[] = [];
  if (context.url) {
    lines.push(`- URL: ${context.url}`);
  }
  const environment = [context.browser, context.os, context.device]
    .filter(Boolean)
    .join(" · ");
  if (environment) {
    lines.push(`- Environment: ${environment}`);
  }
  if (context.viewport) {
    const { width, height, devicePixelRatio } = context.viewport;
    lines.push(`- Viewport: ${width}×${height} @${devicePixelRatio}x`);
  }
  if (context.sdkVersion) {
    lines.push(`- SDK: ${context.sdkVersion}`);
  }
  const { selection } = context;
  if (selection) {
    lines.push(`- Element: ${selection.label} (\`${selection.selector}\`)`);
    if (selection.comment) {
      lines.push(`- Note on element: ${selection.comment}`);
    }
    if (selection.sourceLocation) {
      lines.push(`- Source: ${selection.sourceLocation}`);
    }
    if (selection.componentStack.length > 0) {
      lines.push(`- Components: ${selection.componentStack.join(" > ")}`);
    }
  }
  const consoleErrors = (context.consoleEvents ?? [])
    .filter((event) => event.level === "error")
    .slice(-MAX_CONSOLE_ERRORS);
  if (consoleErrors.length > 0) {
    lines.push(
      "",
      `**Console errors (last ${consoleErrors.length})**`,
      "",
      "```",
      ...consoleErrors.map((event) => event.message),
      "```"
    );
  }
  return lines;
}

export function buildIssueBody(args: {
  dashboardUrl: string;
  feedback: Doc<"feedback">;
  screenshots: IssueScreenshot[];
}): string {
  const sections = [args.feedback.description || "_No description provided._"];

  const contextLines = reportContextLines(args.feedback.context);
  if (contextLines.length > 0) {
    sections.push(["### Report context", ...contextLines].join("\n"));
  }

  const screenshotLinks = args.screenshots
    .filter((screenshot) => screenshot.url)
    .map((screenshot) => `- [${screenshot.filename}](${screenshot.url})`);
  if (screenshotLinks.length > 0) {
    sections.push(["### Screenshots", ...screenshotLinks].join("\n"));
  }

  sections.push(
    `---\n[Open in Reflet](${args.dashboardUrl}) · \`reflet:${args.feedback._id}\``
  );
  return sections.join("\n\n");
}
