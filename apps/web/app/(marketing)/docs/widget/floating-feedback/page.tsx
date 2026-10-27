import type { Metadata } from "next";
import { CodeBlock } from "@/components/docs/code-block";
import {
  DocsLink,
  DocsList,
  DocsPage,
  DocsSection,
  DocsText,
} from "@/components/docs/docs-page";
import { InstallCommand } from "@/components/docs/install-command";
import { PropsTable } from "@/components/docs/props-table";
import { generatePageMetadata } from "@/lib/seo-config";
import { SECTIONS } from "./sections";
import { DevtoolsSection, SessionsSection } from "./team-sections";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Install the React feedback launcher, configure capture and identity, and enable team access.",
  path: "/docs/widget/floating-feedback",
  title: "Floating feedback",
});

const INSTALL = `// app/layout.tsx in Next.js
import { RefletFeedback } from "reflet-sdk/feedback";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <RefletFeedback publicKey="fb_pub_xxx" />
      </body>
    </html>
  );
}`;

const CUSTOM_TRIGGER = `"use client";

import { RefletFeedback } from "reflet-sdk/feedback";

export function Feedback() {
  return (
    <RefletFeedback
      publicKey="fb_pub_xxx"
      captureOnOpen={false}
      captureConsole={false}
      metadata={{ release: "2026.10" }}
      renderTrigger={({ ref, onClick }) => (
        <button ref={ref} onClick={onClick} type="button">
          Report a problem
        </button>
      )}
    />
  );
}`;

const PROPS = [
  {
    description:
      "fb_pub_ key. Falls back to RefletProvider; required to submit.",
    name: "publicKey",
    type: "string",
  },
  {
    description:
      "{ id, email?, name?, avatar? }. Attribution only unless paired with a signed token. Falls back to the provider.",
    name: "user",
    type: "RefletUser",
  },
  {
    description:
      "Server-signed user token. Falls back to the provider and takes precedence over unsigned identity.",
    name: "userToken",
    type: "string",
  },
  {
    description:
      "API origin override; otherwise uses the provider or the hosted API.",
    name: "baseUrl",
    type: "string",
  },
  {
    default: "true",
    description:
      "Show the customer feedback UI. Not an authorization boundary; disable teamTools and devtools separately if needed.",
    name: "enabled",
    type: "boolean",
  },
  {
    default: '"bottom-right"',
    description: "Launcher corner.",
    name: "position",
    type: '"bottom-right" | "bottom-left" | "top-right" | "top-left"',
  },
  {
    default: "20",
    description: "Viewport inset in pixels.",
    name: "offset",
    type: "number",
  },
  {
    default: '"auto"',
    description: "Widget color scheme.",
    name: "theme",
    type: '"auto" | "light" | "dark"',
  },
  { description: "CSS accent color.", name: "primaryColor", type: "string" },
  {
    default: "true",
    description:
      "Capture the viewport on open and refresh the automatic capture while composing. False leaves manual capture available.",
    name: "captureOnOpen",
    type: "boolean",
  },
  {
    default: "true",
    description:
      "Collect warnings, errors, uncaught errors and rejected promises while mounted; attach the latest 30 on submit.",
    name: "captureConsole",
    type: "boolean",
  },
  {
    description:
      "Extra report context. Do not include credentials or sensitive customer data.",
    name: "metadata",
    type: "Record<string, string>",
  },
  {
    description:
      "Override panel labels. Import FeedbackWidgetLabels from reflet-sdk/feedback for the full key list.",
    name: "labels",
    type: "Partial<FeedbackWidgetLabels>",
  },
  {
    default: "null",
    description:
      'Optional toggle shortcut, such as "mod+shift+f". Check conflicts with your app.',
    name: "hotkey",
    type: "string | null",
  },
  {
    description:
      "Positive finite duration for the hide action. Stored locally per public key and user id; not shared across devices.",
    name: "dismissForDays",
    type: "number",
  },
  {
    description:
      "Replace the launcher. Attach both values to an accessible button so open and focus restoration work.",
    name: "renderTrigger",
    type: "({ ref, onClick }) => ReactNode",
  },
  {
    description: "Panel lifecycle callbacks.",
    name: "onOpen / onClose",
    type: "() => void",
  },
  {
    description:
      "Receives the dismissal expiry as a Unix timestamp in milliseconds.",
    name: "onDismiss",
    type: "({ until: number }) => void",
  },
  {
    description:
      "Runs after the report and its attachments finish saving, including a successful attachment retry.",
    name: "onSubmit",
    type: "({ feedbackId: string }) => void",
  },
  {
    default: "true",
    description:
      "Enable development-only tools. Requires a devtools server route for source and account operations.",
    name: "devtools",
    type: "boolean",
  },
  {
    default: "true",
    description:
      "Activate deployed team tools through ?reflet-team or a stored sign-in. Desktop hosts can supply a bridge.",
    name: "teamTools",
    type: "boolean | TeamToolsBridge",
  },
  {
    default: '"https://www.reflet.app"',
    description: "Web origin used for team sign-in.",
    name: "appUrl",
    type: "string",
  },
];

export default function FloatingFeedbackPage() {
  return (
    <DocsPage
      description="A React launcher for written reports, viewport screenshots, annotations and picked elements. It does not display the public feedback board."
      sections={SECTIONS}
      title="Floating feedback"
    >
      <DocsSection id="install" sections={SECTIONS}>
        <DocsText>
          Create an organization API key in Reflet and use its public fb_pub_
          value. Never put an fb_sec_ key in browser code. The CLI can install
          the SDK and mount the launcher:
        </DocsText>
        <InstallCommand command="npx reflet-cli init" />
        <DocsText>
          For supported frameworks, flags and setup diagnostics, see the{" "}
          <DocsLink href="/docs/cli">CLI guide</DocsLink>.
        </DocsText>
      </DocsSection>
      <DocsSection id="manual-setup" sections={SECTIONS}>
        <InstallCommand command="npm install reflet-sdk" />
        <DocsText>
          Mount once in your app shell. The feedback entry is a client boundary,
          so a Next.js layout can stay a Server Component. Replace the
          placeholder key, then open the Feedback button.
        </DocsText>
        <CodeBlock code={INSTALL} />
        <DocsText>
          For Vite, render the same component beside your app. Public keys can
          be literal values or public environment variables. No RefletProvider
          is required.
        </DocsText>
      </DocsSection>
      <DocsSection id="report-contents" sections={SECTIONS}>
        <DocsList>
          <li>
            The first nonempty line of the message becomes the title, capped at
            100 characters. An anonymous visitor can add an email or send
            without one.
          </li>
          <li>
            Screenshots render the DOM without a screen-sharing prompt.
            Reporters can add captures and annotate with pen, arrow, rectangle,
            text, spotlight, highlight or blur.
          </li>
          <li>
            Picking an element attaches its selector, redacted markup, bounds
            and available React component/source information. Production builds
            may omit source locations.
          </li>
          <li>
            Page context includes the URL, title, browser, OS, device, viewport,
            locale, timezone, console events and your metadata.
          </li>
        </DocsList>
      </DocsSection>
      <DocsSection id="props" sections={SECTIONS}>
        <PropsTable props={PROPS} />
        <CodeBlock code={CUSTOM_TRIGGER} />
      </DocsSection>
      <DocsSection id="identified-users" sections={SECTIONS}>
        <DocsText>
          Pass user to attribute reports and skip the email prompt.
          Browser-provided identity is not proof of who signed in. For verified
          identity, generate userToken on your server from the authenticated
          session; see{" "}
          <DocsLink href="/docs/sdk/installation#user-signing">
            user signing
          </DocsLink>
          . Direct props override provider values.
        </DocsText>
      </DocsSection>
      <DevtoolsSection />
      <SessionsSection />
      <DocsSection id="good-to-know" sections={SECTIONS}>
        <DocsList>
          <li>
            Review what your pages expose before enabling capture. Both original
            and annotated screenshots are uploaded. The blur tool changes the
            annotated image, not the stored original. Remove a sensitive capture
            instead of relying on blur.
          </li>
          <li>
            data-reflet-redact scrubs picked-element markup. It does not exclude
            that element from ordinary feedback screenshots. Automatic text
            filters are not a guarantee that all personal data or secrets are
            removed.
          </li>
          <li>
            URL fragments are dropped and credential-shaped query parameters are
            masked. Console strings are filtered, but your metadata and report
            text need your own data policy.
          </li>
          <li>
            Report context is excluded from public API projections. Written
            feedback and contact details entered into its description may still
            be visible on a public board. Do not treat a customer report as an
            internal team note.
          </li>
          <li>
            Cross-origin images, iframes and canvas content may be missing from
            DOM captures. A failed capture can be removed so the report can be
            sent without it.
          </li>
          <li>
            Images upload before the report is created. An upload failure leaves
            the draft for retry. If attaching uploaded images fails after
            creation, use Retry attachments; it does not create another report.
          </li>
          <li>
            The panel uses a shadow root. Configure labels, colors and a custom
            trigger through props rather than host-page CSS. Test keyboard
            focus, your chosen shortcut and zoom in the host app.
          </li>
        </DocsList>
        <DocsText>
          For API authentication, rate limits and error responses, see the{" "}
          <DocsLink href="/docs/api">API reference</DocsLink>.
        </DocsText>
      </DocsSection>
    </DocsPage>
  );
}
