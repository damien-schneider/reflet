import type { Metadata } from "next";
import { SETUP_PROMPT } from "reflet-cli/prompt";

import { CodeBlock } from "@/components/docs/code-block";
import { CopyBlock } from "@/components/docs/copy-block";
import {
  DocsList,
  DocsPage,
  DocsSection,
  DocsText,
} from "@/components/docs/docs-page";
import { InstallCommand } from "@/components/docs/install-command";
import { PropsTable } from "@/components/docs/props-table";
import { InlineCode } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "A floating feedback button for React apps: automatic screenshot, drawing tools, element picker and full page context on every report.",
  path: "/docs/widget/floating-feedback",
  title: "Floating feedback button",
});

const PROPS = [
  {
    default: "—",
    description:
      "Your fb_pub_… key. Optional when the app is wrapped in RefletProvider.",
    name: "publicKey",
    type: "string",
  },
  {
    default: "—",
    description:
      "Who is reporting. Skips the email field and links the report to that user.",
    name: "user",
    type: "{ id, email?, name?, avatar? }",
  },
  {
    default: '"bottom-right"',
    description: "Which corner the button sits in.",
    name: "position",
    type: '"bottom-right" | "bottom-left" | "top-right" | "top-left"',
  },
  {
    default: "true",
    description:
      "Render the widget. Pass a boolean to expose it to staff or beta users only.",
    name: "enabled",
    type: "boolean",
  },
  {
    default: "—",
    description:
      "Adds a panel action that hides the launcher in this browser for the chosen number of days.",
    name: "dismissForDays",
    type: "number",
  },
  {
    default: "true",
    description:
      "Screenshot the viewport as soon as the panel opens. Set to false to make it opt-in.",
    name: "captureOnOpen",
    type: "boolean",
  },
  {
    default: "true",
    description:
      "Record console errors and warnings and attach the last 30 to the report.",
    name: "captureConsole",
    type: "boolean",
  },
  {
    default: "null",
    description:
      'Shortcut that toggles the panel, e.g. "mod+shift+f". Off by default so no app shortcut is hijacked.',
    name: "hotkey",
    type: "string | null",
  },
  {
    default: '"auto"',
    description: "Follows the OS colour scheme unless forced.",
    name: "theme",
    type: '"auto" | "light" | "dark"',
  },
  {
    default: "—",
    description: "Any CSS color. Drives the button and the accents.",
    name: "primaryColor",
    type: "string",
  },
  {
    default: "20",
    description: "Distance in pixels between the button and the viewport edge.",
    name: "offset",
    type: "number",
  },
  {
    default: "—",
    description:
      "Flat string record merged into every report — plan, tenant, release…",
    name: "metadata",
    type: "Record<string, string>",
  },
  {
    default: '["bug", "idea", "question"]',
    description: "Which category chips to show. One category hides the picker.",
    name: "categories",
    type: '("bug" | "idea" | "question")[]',
  },
  {
    default: "—",
    description: "Override any string in the panel for i18n.",
    name: "labels",
    type: "Partial<FeedbackWidgetLabels>",
  },
  {
    default: "true",
    description:
      "Team devtools in development: code view, notes, the board for this page. Never loaded outside NODE_ENV=development.",
    name: "devtools",
    type: "boolean",
  },
  {
    default: "—",
    description: "Fires with the created feedback id after a successful send.",
    name: "onSubmit",
    type: "(result: { feedbackId: string }) => void",
  },
];

const MANUAL_SNIPPET = `import { RefletFeedback } from "reflet-sdk/feedback";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <RefletFeedback publicKey={process.env.NEXT_PUBLIC_REFLET_PUBLIC_KEY} />
      </body>
    </html>
  );
}`;

const IDENTIFIED_SNIPPET = `<RefletFeedback
  publicKey={process.env.NEXT_PUBLIC_REFLET_PUBLIC_KEY}
  user={{ id: user.id, email: user.email, name: user.name }}
  metadata={{ plan: user.plan, tenant: user.orgSlug }}
  hotkey="mod+shift+f"
/>`;

const DEVTOOLS_ROUTE_SNIPPET = `// app/api/reflet-devtools/[...path]/route.ts
export { GET, POST } from "reflet-sdk/devtools/next";

// vite.config.ts
import { refletDevtools } from "reflet-sdk/devtools/vite";
export default defineConfig({ plugins: [react(), refletDevtools()] });`;

const SECTIONS = [
  { id: "install", label: "Install" },
  { id: "manual-setup", label: "Or wire it up yourself" },
  { id: "agent-setup", label: "Set it up with your coding agent" },
  { id: "report-contents", label: "What ends up on a report" },
  { id: "props", label: "Props" },
  { id: "identified-users", label: "Identified users" },
  { id: "devtools", label: "Devtools for your team" },
  { id: "good-to-know", label: "Good to know" },
] as const;

function ReportContents() {
  return (
    <DocsList>
      <li>
        <strong className="text-foreground">Screenshot.</strong> Rendered from
        the DOM, so there is no screen-share permission prompt. The widget
        leaves itself out of its own capture.
      </li>
      <li>
        <strong className="text-foreground">Drawing.</strong> Pen, arrow, box,
        highlight and a redaction tool that pixelates a region before anything
        leaves the browser. Both the clean and the annotated image are stored.
      </li>
      <li>
        <strong className="text-foreground">Element.</strong> Point at anything
        on the page and the report highlights it in the screenshot, with the
        page region it sits in, its redacted markup, a selector that resolves
        back to it, the React component stack, and the source file and line when
        the build exposes them.
      </li>
      <li>
        <strong className="text-foreground">Page context.</strong> URL, title,
        browser, OS, device, viewport, locale and timezone.
      </li>
      <li>
        <strong className="text-foreground">Console.</strong> The last 30 errors
        and warnings the page logged, including uncaught errors and rejected
        promises.
      </li>
    </DocsList>
  );
}

function GoodToKnow() {
  return (
    <DocsList>
      <li>
        The panel lives in a shadow root. Your CSS can’t reach it and its CSS
        can’t reach your app.
      </li>
      <li>
        Component names and source locations come from React’s debug data.
        Development and preview builds give you{" "}
        <InlineCode>src/billing/invoice-row.tsx:42:7</InlineCode>. Production
        builds strip that, so reports fall back to the component stack and the
        selector.
      </li>
      <li>
        Screenshots are rendered from the DOM. Cross-origin images without CORS
        headers, iframes and canvas content may come out blank.
      </li>
      <li>
        A failed screenshot upload never loses the written report. The feedback
        is created first and the image is attached after.
      </li>
      <li>
        The markup of a picked element is scrubbed before it leaves the browser:
        typed-in values, emails and token-shaped strings are replaced. Mark a
        subtree with <InlineCode>data-reflet-redact</InlineCode> to keep its
        contents out of reports entirely.
      </li>
      <li>
        Report context is only visible to members of your organization, not to
        visitors on a public board.
      </li>
      <li>
        Your organization doesn’t have to be public. The public key writes
        reports and nothing else; reading the board still needs a member session
        or a secret key.
      </li>
      <li>
        A public key can send 30 reports per minute, shared by every visitor.
        Screenshot uploads don’t count toward that, and a report takes at most
        10 screenshots. Past the limit the API answers{" "}
        <InlineCode>429</InlineCode> and the panel shows the error.
      </li>
    </DocsList>
  );
}

function DevtoolsSection() {
  return (
    <DocsSection id="devtools" sections={SECTIONS}>
      <DocsText>
        On your dev server, the same component adds a small bar above the
        launcher that you can drag anywhere. Pick an element to write a note on
        it, or Shift-click it to open its source with the JSX highlighted. Copy
        your notes as one prompt for a coding agent, or send them to the board
        as internal feedback that only members see. The Board tab lists the
        feedback reported on the current page, with the element and its code one
        click away. Production builds never ship it.
      </DocsText>
      <DocsText>
        Code view and the board go through one dev-only route. To reach the
        board, click Connect to Reflet in the Board tab and approve your dev
        server on reflet.app: it keeps a revocable token outside your
        repository. You can also set <InlineCode>REFLET_SECRET_KEY</InlineCode>{" "}
        on the server instead. Set <InlineCode>REFLET_EDITOR</InlineCode> to{" "}
        <InlineCode>cursor</InlineCode>, <InlineCode>zed</InlineCode>,{" "}
        <InlineCode>windsurf</InlineCode> or <InlineCode>webstorm</InlineCode>{" "}
        for the editor links.
      </DocsText>
      <CodeBlock code={DEVTOOLS_ROUTE_SNIPPET} />
    </DocsSection>
  );
}

export default function FloatingFeedbackPage() {
  return (
    <DocsPage
      description="One component drops a feedback button into your app. Every report arrives with a screenshot of what the user was looking at, whatever they drew on it, the page they were on and, when they point at one, the React component behind the element."
      sections={SECTIONS}
      title="Floating feedback button"
    >
      <DocsSection id="install" sections={SECTIONS}>
        <DocsText>
          The CLI installs the SDK, mounts the widget in your app entry file and
          writes the key to the right env file. It detects Next.js (both
          routers), Vite and React Router, and never edits a file it can’t place
          the widget in.
        </DocsText>
        <InstallCommand command="npx reflet-cli init" />
        <DocsText>
          Non-interactive, for scripts and agents:{" "}
          <InlineCode>
            npx reflet-cli init --public-key fb_pub_xxx --yes
          </InlineCode>
          . Check an existing setup with{" "}
          <InlineCode>npx reflet-cli doctor</InlineCode>.
        </DocsText>
      </DocsSection>

      <DocsSection id="manual-setup" sections={SECTIONS}>
        <DocsText>
          Mount it once, as the last child of your app shell. The entry ships
          its own <InlineCode>&quot;use client&quot;</InlineCode> directive, so
          a Next.js layout can stay a Server Component.
        </DocsText>
        <CodeBlock code={MANUAL_SNIPPET} />
        <DocsText>
          With Vite, read the key from{" "}
          <InlineCode>import.meta.env.VITE_REFLET_PUBLIC_KEY</InlineCode>{" "}
          instead, and render the widget next to{" "}
          <InlineCode>&lt;App /&gt;</InlineCode>.
        </DocsText>
      </DocsSection>

      <DocsSection id="agent-setup" sections={SECTIONS}>
        <DocsText>
          Paste this into Claude Code, Cursor or any agent working in the repo.
          It’s the same text <InlineCode>npx reflet-cli prompt</InlineCode>{" "}
          prints.
        </DocsText>
        <CopyBlock content={SETUP_PROMPT} label="Setup prompt" />
      </DocsSection>

      <DocsSection id="report-contents" sections={SECTIONS}>
        <ReportContents />
      </DocsSection>

      <DocsSection id="props" sections={SECTIONS}>
        <PropsTable props={PROPS} />
      </DocsSection>

      <DocsSection id="identified-users" sections={SECTIONS}>
        <DocsText>
          Pass the current user and the widget stops asking for an email. Add
          your own metadata to slice reports by plan, tenant or release.
        </DocsText>
        <CodeBlock code={IDENTIFIED_SNIPPET} />
      </DocsSection>

      <DevtoolsSection />

      <DocsSection id="good-to-know" sections={SECTIONS}>
        <GoodToKnow />
      </DocsSection>
    </DocsPage>
  );
}
