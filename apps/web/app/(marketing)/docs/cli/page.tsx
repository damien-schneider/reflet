import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ctrl-ui/react/ui/table";
import type { Metadata } from "next";
import Link from "next/link";
import { AGENT_PROMPT } from "reflet-cli/agent-prompt";

import { CopyBlock } from "@/components/docs/copy-block";
import { InstallCommand } from "@/components/docs/install-command";
import { InlineCode } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";
import { COMMAND_GROUPS, RECIPES } from "./cli-docs-data";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Drive Reflet from a shell: claim the next feedback, read its context, open the GitHub issue and close it once merged. Built for Claude Code, Cursor, Codex and CI.",
  keywords: [
    "cli",
    "coding agent",
    "claude code",
    "cursor",
    "codex",
    "feedback automation",
    "github issues",
  ],
  path: "/docs/cli",
  title: "CLI for agents",
});

const ENV_VARS = [
  {
    description: "Secret key (fb_sec_…). Wins over the stored config.",
    name: "REFLET_API_KEY",
    required: "Yes, or reflet login",
  },
  {
    description: "API base URL, self-hosted deployments only.",
    name: "REFLET_API_URL",
    required: "No",
  },
] as const;

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="mb-3 font-display text-2xl text-foreground leading-snug tracking-tight">
      {children}
    </h2>
  );
}

export default function CliDocsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-foreground leading-snug tracking-tight">
        CLI for agents
      </h1>
      <p className="mb-8 text-base text-muted-foreground sm:text-xl">
        <InlineCode>reflet</InlineCode> exposes the whole admin API as shell
        commands, so any coding agent that can run a terminal can pick up
        feedback, fix it and close the loop. Output is JSON whenever it is piped
        or given <InlineCode>--json</InlineCode>.
      </p>

      <section className="mb-10">
        <SectionTitle>Connect</SectionTitle>
        <p className="mb-3 text-muted-foreground text-sm">
          Generate a secret key in{" "}
          <strong className="text-foreground">
            Dashboard → Project → Agents &amp; CLI
          </strong>
          , then store it once. It lands in{" "}
          <InlineCode>~/.reflet/config.json</InlineCode> (owner-only).
        </p>
        <div className="space-y-2">
          <InstallCommand command="npx reflet-cli login --api-key fb_sec_…" />
          <InstallCommand command="npx reflet-cli feedback next --json" />
        </div>
      </section>

      <section className="mb-10">
        <SectionTitle>Install the workflow</SectionTitle>
        <p className="mb-3 text-muted-foreground text-sm">
          Run once in the repository the feedback is about. It writes the queue
          workflow to <InlineCode>.agents/skills/reflet/</InlineCode>,{" "}
          <InlineCode>.claude/skills/reflet/</InlineCode>,{" "}
          <InlineCode>.omp/skills/reflet/</InlineCode> and{" "}
          <InlineCode>.claude/commands/reflet.md</InlineCode>, then{" "}
          <InlineCode>/reflet</InlineCode> in Claude Code,{" "}
          <InlineCode>$reflet</InlineCode> in Codex — or a plain ask in any
          other agent — works the queue until it is empty.
        </p>
        <div className="space-y-2">
          <InstallCommand command="npx reflet-cli agent install" />
          <InstallCommand command="npx reflet-cli screenshot download <feedbackId>" />
        </div>
      </section>

      <section className="mb-10">
        <SectionTitle>Agent loop</SectionTitle>
        <p className="mb-3 text-muted-foreground text-sm">
          What that skill contains, for an agent that reads no skill files. Also
          printed by <InlineCode>npx reflet-cli prompt agent</InlineCode>.
          Merging a PR that says <InlineCode>Closes #issue</InlineCode> or{" "}
          <InlineCode>fixes reflet:&lt;id&gt;</InlineCode> marks the feedback
          completed through the GitHub integration.
        </p>
        <CopyBlock content={AGENT_PROMPT} label="Agent prompt" />
      </section>

      <section className="mb-10">
        <SectionTitle>Recipes</SectionTitle>
        <div className="space-y-4">
          {RECIPES.map((recipe) => (
            <div
              className="rounded-lg border border-border p-4"
              key={recipe.title}
            >
              <h3 className="mb-1 font-semibold text-foreground text-sm">
                {recipe.title}
              </h3>
              <p className="font-mono text-muted-foreground text-xs leading-relaxed">
                {recipe.prompt}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <SectionTitle>Commands</SectionTitle>
        <p className="mb-4 text-muted-foreground text-sm">
          <InlineCode>reflet &lt;resource&gt;</InlineCode> lists the actions of
          a resource with their flags. Booleans are passed as{" "}
          <InlineCode>--public true</InlineCode>; dates as ISO or epoch ms.
        </p>
        <div className="space-y-6">
          {COMMAND_GROUPS.map((group) => (
            <div key={group.category}>
              <h3 className="mb-2 font-semibold text-foreground text-sm">
                {group.category}
              </h3>
              <div className="overflow-hidden rounded-lg border border-border">
                <Table className="text-sm">
                  <TableBody>
                    {group.commands.map((entry) => (
                      <TableRow key={entry.command}>
                        <TableCell>
                          <InlineCode>{entry.command}</InlineCode>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                          {entry.description}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <SectionTitle>Environment variables</SectionTitle>
        <div className="overflow-hidden rounded-lg border border-border">
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Variable</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ENV_VARS.map((entry) => (
                <TableRow key={entry.name}>
                  <TableCell>
                    <InlineCode>{entry.name}</InlineCode>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.required}
                  </TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">
                    {entry.description}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="mb-10">
        <SectionTitle>Resources</SectionTitle>
        <ul className="list-inside list-disc space-y-2 text-muted-foreground text-sm">
          <li>
            <Link
              className="underline underline-offset-4 hover:text-foreground"
              href="/docs/api"
            >
              REST API — the same endpoints the CLI calls, plus outbound
              webhooks
            </Link>
          </li>
          <li>
            <Link
              className="underline underline-offset-4 hover:text-foreground"
              href="/docs/widget/floating-feedback"
            >
              Widget setup — <InlineCode>npx reflet-cli init</InlineCode>
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
