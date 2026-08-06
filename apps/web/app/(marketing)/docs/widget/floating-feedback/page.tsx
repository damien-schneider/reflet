import type { Metadata } from "next";
import { SETUP_PROMPT } from "reflet-cli/prompt";

import { CopyBlock } from "@/components/docs/copy-block";
import { InstallCommand } from "@/components/docs/install-command";
import { PropsTable } from "@/components/docs/props-table";
import { InlineCode } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "A floating feedback button for React apps: automatic screenshot, drawing tools, element picker and full page context on every report.",
  path: "/docs/widget/floating-feedback",
  title: "Floating Feedback Button",
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

function Section({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function FloatingFeedbackPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
        Floating Feedback Button
      </h1>
      <p className="mb-8 text-base text-muted-foreground sm:text-xl">
        One component drops a feedback button into your app. Every report
        arrives with a screenshot of what the user was looking at, whatever they
        drew on it, the page they were on, and — when they point at one — the
        React component behind the element.
      </p>

      <Section title="Install">
        <p className="mb-4 text-muted-foreground text-sm">
          The CLI installs the SDK, mounts the widget in your app entry file and
          writes the key to the right env file. It detects Next.js (both
          routers), Vite and React Router, and never edits a file it cannot
          place the widget in.
        </p>
        <InstallCommand command="npx reflet-cli init" />
        <p className="mt-3 text-muted-foreground text-xs">
          Non-interactive, for scripts and agents:{" "}
          <InlineCode>
            npx reflet-cli init --public-key fb_pub_xxx --yes
          </InlineCode>
          . Check an existing setup with{" "}
          <InlineCode>npx reflet-cli doctor</InlineCode>.
        </p>
      </Section>

      <Section title="Or wire it up yourself">
        <p className="mb-4 text-muted-foreground text-sm">
          Mount it once, as the last child of your app shell. The entry ships
          its own <InlineCode>&quot;use client&quot;</InlineCode> directive, so
          a Next.js layout can stay a Server Component.
        </p>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <pre className="overflow-x-auto text-sm">{MANUAL_SNIPPET}</pre>
        </div>
        <p className="mt-3 text-muted-foreground text-xs">
          With Vite, read the key from{" "}
          <InlineCode>import.meta.env.VITE_REFLET_PUBLIC_KEY</InlineCode>{" "}
          instead, and render the widget next to{" "}
          <InlineCode>&lt;App /&gt;</InlineCode>.
        </p>
      </Section>

      <Section title="Set it up with your coding agent">
        <p className="mb-4 text-muted-foreground text-sm">
          Paste this into Claude Code, Cursor or any agent working in the repo.
          It is the same text <InlineCode>npx reflet-cli prompt</InlineCode>{" "}
          prints.
        </p>
        <CopyBlock content={SETUP_PROMPT} label="Setup prompt" />
      </Section>

      <Section title="What ends up on a report">
        <ul className="space-y-2 text-muted-foreground text-sm">
          <li>
            <strong className="text-foreground">Screenshot.</strong> Rendered
            from the DOM, so there is no screen-share permission prompt. The
            widget excludes itself from its own capture.
          </li>
          <li>
            <strong className="text-foreground">Drawing.</strong> Pen, arrow,
            box, highlight and a redaction tool that pixelates a region before
            anything leaves the browser. Both the clean and the annotated image
            are stored.
          </li>
          <li>
            <strong className="text-foreground">Element.</strong> Point at
            anything on the page and the report carries a selector that resolves
            back to it, the React component stack, and the source file and line
            when the build exposes them.
          </li>
          <li>
            <strong className="text-foreground">Page context.</strong> URL,
            title, browser, OS, device, viewport, locale and timezone.
          </li>
          <li>
            <strong className="text-foreground">Console.</strong> The last 30
            errors and warnings the page logged, including uncaught errors and
            rejected promises.
          </li>
        </ul>
      </Section>

      <Section title="Props">
        <PropsTable props={PROPS} />
      </Section>

      <Section title="Identified users">
        <p className="mb-4 text-muted-foreground text-sm">
          Pass the current user and the widget stops asking for an email. Add
          your own metadata to slice reports by plan, tenant or release.
        </p>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <pre className="overflow-x-auto text-sm">{IDENTIFIED_SNIPPET}</pre>
        </div>
      </Section>

      <Section title="Good to know">
        <ul className="space-y-2 text-muted-foreground text-sm">
          <li>
            The panel lives in a shadow root. Your CSS cannot reach it and its
            CSS cannot reach your app.
          </li>
          <li>
            Component names and source locations come from React&apos;s debug
            data. Development and preview builds give you{" "}
            <InlineCode>src/billing/invoice-row.tsx:42:7</InlineCode> —
            production builds strip that, so reports fall back to the component
            stack and the selector.
          </li>
          <li>
            Screenshots are rendered from the DOM. Cross-origin images without
            CORS headers, iframes and canvas content may come out blank.
          </li>
          <li>
            A failed screenshot upload never loses the written report — the
            feedback is created first, the image is attached after.
          </li>
          <li>
            Report context is only visible to members of your organization, not
            to visitors on a public board.
          </li>
          <li>
            Your organization does not have to be public. The public key writes
            reports and nothing else — reading the board still needs a member
            session or a secret key.
          </li>
          <li>
            A public key is capped at 30 reports per minute. Past that the API
            answers <InlineCode>429</InlineCode> and the panel shows the error.
          </li>
        </ul>
      </Section>
    </div>
  );
}
