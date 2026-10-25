import { MarkdownInlineCode } from "@ctrl-ui/react/ui/markdown-elements";
import type { Metadata } from "next";
import { AGENT_PROMPT } from "reflet-cli/agent-prompt";
import { CodeBlock } from "@/components/docs/code-block";
import { CopyBlock } from "@/components/docs/copy-block";
import {
  DocsLink,
  DocsList,
  DocsPage,
  DocsSection,
  DocsSubsection,
  DocsText,
} from "@/components/docs/docs-page";
import { InstallCommand } from "@/components/docs/install-command";
import { ReferenceTable } from "@/components/docs/reference-table";
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

const SECTIONS = [
  { id: "connect", label: "Connect" },
  { id: "workflow", label: "Install the workflow" },
  { id: "agent-loop", label: "Agent loop" },
  { id: "recipes", label: "Recipes" },
  { id: "commands", label: "Commands" },
  { id: "environment", label: "Environment variables" },
  { id: "resources", label: "Resources" },
] as const;

const COMMAND_COLUMNS = [
  { kind: "name", label: "Command" },
  { kind: "text", label: "Description" },
] as const;

const ENV_COLUMNS = [
  { kind: "name", label: "Variable" },
  { kind: "text", label: "Required" },
  { kind: "text", label: "Description" },
] as const;

const ENV_ROWS = [
  {
    cells: [
      "REFLET_API_KEY",
      "Yes, or run reflet login",
      "Secret key (fb_sec_…). Takes precedence over the stored config.",
    ],
    key: "REFLET_API_KEY",
  },
  {
    cells: [
      "REFLET_API_URL",
      "No",
      "API base URL, for self-hosted deployments only.",
    ],
    key: "REFLET_API_URL",
  },
] as const;

function WorkflowSection() {
  return (
    <DocsSection id="workflow" sections={SECTIONS}>
      <DocsText>
        Run it once in the repository the feedback is about. It writes the queue
        workflow to{" "}
        <MarkdownInlineCode>.agents/skills/reflet/</MarkdownInlineCode> (Codex,
        omp), <MarkdownInlineCode>.claude/skills/reflet/</MarkdownInlineCode>{" "}
        and <MarkdownInlineCode>.claude/commands/reflet.md</MarkdownInlineCode>.
        After that, <MarkdownInlineCode>/reflet</MarkdownInlineCode> in Claude
        Code, <MarkdownInlineCode>$reflet</MarkdownInlineCode> in Codex or a
        plain ask in any other agent works the queue until it’s empty. Pass a
        feedback id to scope the run to one item.
      </DocsText>
      <InstallCommand command="npx reflet-cli agent install" />
      <InstallCommand command="npx reflet-cli screenshot download <feedbackId>" />
    </DocsSection>
  );
}

function CommandsSection() {
  return (
    <DocsSection id="commands" sections={SECTIONS}>
      <DocsText>
        <MarkdownInlineCode>reflet &lt;resource&gt;</MarkdownInlineCode> lists a
        resource’s actions with their flags. Pass booleans as{" "}
        <MarkdownInlineCode>--public true</MarkdownInlineCode> and dates as ISO
        strings or epoch milliseconds.
      </DocsText>
      <div className="flex flex-col gap-8">
        {COMMAND_GROUPS.map((group) => (
          <DocsSubsection key={group.category} title={group.category}>
            <ReferenceTable
              columns={COMMAND_COLUMNS}
              rows={group.commands.map((entry) => ({
                cells: [entry.command, entry.description],
                key: entry.command,
              }))}
            />
          </DocsSubsection>
        ))}
      </div>
    </DocsSection>
  );
}

export default function CliDocsPage() {
  return (
    <DocsPage
      description={
        <>
          <MarkdownInlineCode>reflet</MarkdownInlineCode> exposes the whole
          admin API as shell commands, so any coding agent that can run a
          terminal can pick up feedback, fix it and close the loop. Output is
          JSON whenever it’s piped or given{" "}
          <MarkdownInlineCode>--json</MarkdownInlineCode>.
        </>
      }
      sections={SECTIONS}
      title="CLI for agents"
    >
      <DocsSection id="connect" sections={SECTIONS}>
        <DocsText>
          Generate a secret key in{" "}
          <strong className="font-medium text-foreground">
            Dashboard → Project → Agents &amp; CLI
          </strong>
          , then store it once. It’s saved to{" "}
          <MarkdownInlineCode>~/.reflet/config.json</MarkdownInlineCode>,
          readable only by you.
        </DocsText>
        <InstallCommand command="npx reflet-cli login --api-key fb_sec_…" />
        <InstallCommand command="npx reflet-cli feedback next --json" />
      </DocsSection>

      <WorkflowSection />

      <DocsSection id="agent-loop" sections={SECTIONS}>
        <DocsText>
          What that skill contains, for an agent that reads no skill files.{" "}
          <MarkdownInlineCode>npx reflet-cli prompt agent</MarkdownInlineCode>{" "}
          prints the same text. Merging a PR that says{" "}
          <MarkdownInlineCode>Closes #issue</MarkdownInlineCode> or{" "}
          <MarkdownInlineCode>fixes reflet:&lt;id&gt;</MarkdownInlineCode> marks
          the feedback completed through the GitHub integration.
        </DocsText>
        <CopyBlock content={AGENT_PROMPT} label="Agent prompt" />
      </DocsSection>

      <DocsSection id="recipes" sections={SECTIONS}>
        <DocsText>Prompts to paste into your agent.</DocsText>
        {RECIPES.map((recipe) => (
          <CodeBlock
            code={recipe.prompt}
            copySubject="prompt"
            key={recipe.title}
            title={recipe.title}
            wrap
          />
        ))}
      </DocsSection>

      <CommandsSection />

      <DocsSection id="environment" sections={SECTIONS}>
        <ReferenceTable columns={ENV_COLUMNS} rows={ENV_ROWS} />
      </DocsSection>

      <DocsSection id="resources" sections={SECTIONS}>
        <DocsList>
          <li>
            <DocsLink href="/docs/api">REST API</DocsLink>: the endpoints the
            CLI calls, plus outbound webhooks.
          </li>
          <li>
            <DocsLink href="/docs/widget/floating-feedback">
              Widget setup
            </DocsLink>
            : <MarkdownInlineCode>npx reflet-cli init</MarkdownInlineCode>.
          </li>
        </DocsList>
      </DocsSection>
    </DocsPage>
  );
}
