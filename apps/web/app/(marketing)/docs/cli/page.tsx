import type { Metadata } from "next";
import { CodeBlock } from "@/components/docs/code-block";
import {
  DocsLink,
  DocsList,
  DocsNote,
  DocsPage,
  DocsSection,
  DocsSubsection,
  DocsText,
} from "@/components/docs/docs-page";
import { ReferenceTable } from "@/components/docs/reference-table";
import { generatePageMetadata } from "@/lib/seo-config";
import { COMMAND_GROUPS } from "./cli-docs-data";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Install the widget, manage an organization, install agent workflows and follow Reflet Live recordings from a terminal.",
  path: "/docs/cli",
  title: "CLI",
});

const SECTIONS = [
  { id: "connect", label: "Install and connect" },
  { id: "widget", label: "Set up the widget" },
  { id: "workflow", label: "Install agent workflows" },
  { id: "queue", label: "Work a feedback item" },
  { id: "live", label: "Follow a live recording" },
  { id: "commands", label: "Command reference" },
  { id: "environment", label: "Configuration and failures" },
] as const;

export default function CliDocsPage() {
  return (
    <DocsPage
      description="reflet-cli provides widget setup, organization administration and local recording handoff to coding agents. Installing a workflow does not start an agent or change your app by itself."
      sections={SECTIONS}
      title="CLI"
    >
      <DocsSection id="connect" sections={SECTIONS}>
        <DocsText>
          Requires Node.js 18 or later. Use npx without a global install, or
          install the package to get the reflet executable. A Reflet account and
          organization key are needed for organization commands, not for reading
          help or previewing widget setup.
        </DocsText>
        <CodeBlock
          code={`npx reflet-cli@latest --help

# Optional global installation:
npm install -g reflet-cli
reflet --version`}
        />
        <DocsText>
          An organization owner or administrator can create a secret fb_sec_ key
          in Settings → Agents &amp; CLI. Login verifies the key by reading its
          organization and stores it in ~/.reflet/config.json with mode 0600.
          The prompt is ordinary terminal input, not a masked password field.
          Prefer a secret environment variable in automation; passing --api-key
          can expose it in shell history and process arguments.
        </DocsText>
        <CodeBlock
          code={`npx reflet-cli login
npx reflet-cli org get --json

# In CI, supply REFLET_API_KEY from your secret store instead of logging in.
# For self-hosting, store your backend HTTP origin, without /api/v1:
npx reflet-cli login --api-url https://your-deployment.convex.site`}
        />
        <DocsText>
          Public widget keys cannot administer an organization. The secret key
          selects one organization and grants its administrative API access. Do
          not put it in public environment variables or commit the config. There
          is no logout command; remove the stored credential from the config and
          revoke the key in the dashboard when it is no longer used.
        </DocsText>
      </DocsSection>
      <DocsSection id="widget" sections={SECTIONS}>
        <CodeBlock
          code={`# Run at the app root. Preview first, then apply:
npx reflet-cli init --public-key fb_pub_your_key --dry-run
npx reflet-cli init --public-key fb_pub_your_key --yes
npx reflet-cli doctor`}
        />
        <DocsText>
          init detects Next.js App/Pages Router, Vite React and React Router
          entry files. It installs reflet-sdk using the detected lockfile (Bun,
          pnpm, Yarn, otherwise npm), imports RefletFeedback from
          reflet-sdk/feedback, mounts it in the entry and writes the public key.
          Next.js uses NEXT_PUBLIC_REFLET_PUBLIC_KEY in .env.local; other
          detected apps use VITE_REFLET_PUBLIC_KEY in .env. Review these source,
          environment, package and lockfile changes before committing. Existing
          widget mounts are left alone; unsupported entry shapes produce a
          snippet for manual installation.
        </DocsText>
        <DocsList>
          <li>
            --cwd selects an app directory. It does not discover every app in a
            monorepo.
          </li>
          <li>
            --dry-run neither writes files nor installs packages. --skip-install
            skips only the package-manager call.
          </li>
          <li>
            --yes disables the key prompt. Without a supplied or existing key,
            fill in the reported environment variable yourself.
          </li>
          <li>
            --position accepts bottom-right (default), bottom-left, top-right or
            top-left.
          </li>
        </DocsList>
        <DocsText>
          doctor is a read-only local check of package.json, the SDK dependency,
          detected entry, a RefletFeedback marker and a nonempty environment
          value. Exit 0 means these checks pass; exit 1 means at least one
          failed. It does not contact Reflet, validate the key or test the
          running widget. Use npx reflet-cli prompt for the setup instructions,
          or follow the{" "}
          <DocsLink href="/docs/widget/floating-feedback">
            manual setup guide
          </DocsLink>
          .
        </DocsText>
      </DocsSection>
      <DocsSection id="workflow" sections={SECTIONS}>
        <CodeBlock
          code={`npx reflet-cli agent install --dry-run
npx reflet-cli agent install

# Install only the live workflow in your home directory:
npx reflet-cli agent install --global`}
        />
        <DocsText>
          Repository installation writes reflet and reflet-live SKILL.md files
          under .agents/skills and .claude/skills, plus matching Markdown slash
          commands under .claude/commands. It replaces differing files at those
          paths, including your local edits. It appends .reflet/ to an existing
          .gitignore; if no .gitignore exists, it asks you to add the entry.
          --cwd chooses the repository. --global writes only reflet-live under
          your home directory and does not edit a repository's ignore file.
        </DocsText>
        <DocsText>
          Invoke /reflet or /reflet-live in Claude Code, or $reflet and
          $reflet-live in Codex. The feedback workflow accepts an optional
          feedback ID to limit its scope. Other agents can read the text from
          prompt agent or prompt live. These are instructions for an agent with
          terminal access, not a background worker or authorization to make
          arbitrary changes. Review what the agent will read and mutate.
        </DocsText>
      </DocsSection>
      <DocsSection id="queue" sections={SECTIONS}>
        <CodeBlock
          code={`# Inspect without claiming:
npx reflet-cli feedback next --statuses open,planned --limit 5 --json

# This claims one item and moves it to in_progress:
npx reflet-cli feedback claim-next --as my-agent --json

# Set FEEDBACK_ID from the returned id, then inspect its context:
npx reflet-cli feedback get "$FEEDBACK_ID" --json
npx reflet-cli feedback comments "$FEEDBACK_ID" --json
npx reflet-cli screenshot download "$FEEDBACK_ID"

# Optional: create/link a GitHub issue after configuring the integration.
npx reflet-cli feedback issue "$FEEDBACK_ID" --json

# When the work is actually complete:
npx reflet-cli feedback status "$FEEDBACK_ID" completed`}
        />
        <DocsText>
          next orders eligible feedback by priority, votes, then oldest
          creation. Defaults are open, under_review and planned; tags match any
          supplied tag ID. It excludes deleted, merged, session-proposal
          feedback and claims made in the last two hours. claim-next returns
          null when nothing qualifies. --as defaults to your username@hostname
          and is sent to Reflet. A claim expires after two hours, but expiry
          does not move in_progress feedback back into the default queue. claim
          can renew a specific item owned by the same claimant.
        </DocsText>
        <DocsNote>
          feedback comment and feedback vote are present in CLI help but cannot
          currently succeed: their public backend endpoints require a signed
          X-User-Token and the CLI sends only a bearer key. Use the dashboard
          for replies or the signed-user HTTP API. Comment editing, deletion and
          official-reply marking use administrative endpoints and do work with
          the secret key. The installed agent prompt is not an exception to this
          authentication boundary.
        </DocsNote>
        <DocsText>
          Downloaded screenshots and feedback context can contain private page
          data, user email and source information. Downloads overwrite matching
          filenames in .reflet/screenshots/&lt;feedbackId&gt; or --out. Do not
          commit them. Claims, status changes, issue creation, invitations and
          publishing are real writes. GitHub closing keywords require the
          configured integration; the CLI does not open, merge or verify a PR
          for you.
        </DocsText>
      </DocsSection>
      <DocsSection id="live" sections={SECTIONS}>
        <CodeBlock
          code={`# Terminal 1: keep this running.
npx reflet-cli live

# Terminal 2, in the repository your agent will edit:
npx reflet-cli live watch --json

# Read the workflow without installing it:
npx reflet-cli prompt live`}
        />
        <DocsText>
          live starts a loopback-only hub at 127.0.0.1:47417 and opens its
          browser window, preferring Chrome or Edge. Connect through an app's
          devtools footer first, then choose the organization and press Record
          in the Live window. Grant microphone access when requested. Move
          between connected apps while speaking. This is a Reflet recording
          session, not a local-only audio recorder; captures and transcription
          use the connected organization's backend. See the{" "}
          <DocsLink href="/docs/sdk/devtools#sessions">
            session privacy and capture reference
          </DocsLink>
          .
        </DocsText>
        <DocsText>
          --port chooses the hub port and --no-open leaves the browser unopened.
          An existing healthy hub is reused. Credentials for the local hub are
          written to ~/.reflet/live.json with mode 0600. Stop the foreground
          process with Ctrl+C; it asks the window to stop and waits up to 15
          seconds for uploads. If the window does not finish, the final passages
          may be missing. Do not close it before pending uploads finish.
        </DocsText>
        <DocsText>
          live watch follows the newest session, polls every two seconds and
          returns fresh passages after transcription settles, at session end or
          after --timeout (default 90 seconds; whole seconds from 1 to 3600). It
          is one wait, not a continuous stream: call it again to continue. JSON
          is the default when piped. Timeout or no running hub returns a report
          with no new entries and exit 0, not a command error.
        </DocsText>
        <DocsText>
          The report can include the app, transcript, clicked/pointed elements,
          source locations and screenshots. Cited screenshots are downloaded to
          .reflet/live/&lt;sessionId&gt; and the delivered-entry cursor is
          stored in .reflet/live/watch.json relative to the current directory.
          Calls from the same directory share that cursor. Keep .reflet/ out of
          git; deleting the cursor can cause entries to be delivered again.
          Local CLI login is not how the Live window authorizes recordings: it
          uses a connected app's member-scoped devtools access.
        </DocsText>
      </DocsSection>
      <DocsSection id="commands" sections={SECTIONS}>
        <DocsText>
          Run reflet --help for setup commands, reflet live --help for live
          options, or reflet &lt;resource&gt; &lt;action&gt; --help for every
          action/flag in that resource. Resource help lists flags without
          executing a request. Bare reflet &lt;resource&gt; also lists actions
          but exits 1. All admin commands support --json; piped output is JSON
          automatically. Interactive output may be a table, so use --json to
          retain pagination metadata.
        </DocsText>
        <ReferenceTable
          columns={[
            { kind: "name", label: "Resource" },
            { kind: "text", label: "Actions" },
            { kind: "text", label: "Usage" },
          ]}
          rows={COMMAND_GROUPS.map((group) => ({
            cells: [group.resource, group.actions, group.description],
            key: `${group.resource}-${group.actions}`,
          }))}
        />
        <DocsSubsection id="values" title="Flags and pagination">
          <DocsText>
            Boolean flags take a value, such as --public true or --support
            false. Dates accept ISO strings or epoch milliseconds. JSON flags
            such as --questions and --trigger-config take a quoted JSON value.
            Pass IDs, not display names, for tags, members and custom statuses.
            Color and lifecycle values follow the
            <DocsLink href="/docs/api#admin-values">
              HTTP API reference
            </DocsLink>
            .
          </DocsText>
          <CodeBlock
            code={`npx reflet-cli feedback list --sort votes --limit 20 --offset 0 --json
npx reflet-cli milestone create --name 'Billing' --color blue --horizon next_quarter
npx reflet-cli survey create --title 'Checkout' --trigger manual \\
  --questions '[{"type":"nps","title":"Would you recommend us?","required":true}]'
npx reflet-cli release schedule "$RELEASE_ID" --at 2027-01-15T09:00:00Z`}
          />
          <DocsText>
            Feedback and release lists return items, total and hasMore; advance
            --offset by the number returned. Survey responses return page,
            continueCursor and isDone; pass --cursor until isDone. Other list
            commands return arrays unless their help/API says otherwise. For
            publication state changes and survey settings not exposed as CLI
            flags, use the{" "}
            <DocsLink href="/docs/api#admin-api">
              administrative HTTP API
            </DocsLink>
            .
          </DocsText>
        </DocsSubsection>
      </DocsSection>
      <DocsSection id="environment" sections={SECTIONS}>
        <DocsText>
          REFLET_API_KEY overrides the stored key. REFLET_API_URL overrides the
          stored URL; otherwise the default backend is
          https://harmless-clam-802.convex.site. These variables configure API
          commands, not the public widget key written by init. Login's --api-url
          is stored; the environment override is not.
        </DocsText>
        <DocsText>
          Commands print errors to stderr and exit 1 on invalid input, network
          errors or rejected API requests. The CLI does not retry failed API
          calls. Before repeating a write after a network failure, inspect its
          current state. For HTTP errors, rate limits and permission rules, use
          the <DocsLink href="/docs/api#errors">API error reference</DocsLink>.
        </DocsText>
      </DocsSection>
    </DocsPage>
  );
}
