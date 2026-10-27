import type { Metadata } from "next";
import { CodeBlock } from "@/components/docs/code-block";
import {
  DocsLink,
  DocsList,
  DocsPage,
  DocsSection,
  DocsText,
} from "@/components/docs/docs-page";
import { PropsTable } from "@/components/docs/props-table";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Set up Reflet devtools in Next.js or Vite, connect a team account, and understand note and session capture.",
  path: "/docs/sdk/devtools",
  title: "Devtools and sessions",
});

const SECTIONS = [
  { id: "nextjs", label: "Connect Next.js" },
  { id: "vite", label: "Connect Vite" },
  { id: "access", label: "Choose team access" },
  { id: "notes", label: "Take notes and inspect source" },
  { id: "sessions", label: "Record and hand off a session" },
  { id: "troubleshooting", label: "Resolve setup failures" },
] as const;

const WIDGET = `"use client";

import { RefletFeedback } from "reflet-sdk/feedback";

export function FeedbackTools() {
  return <RefletFeedback publicKey="fb_pub_YOUR_PUBLIC_KEY" />;
}`;

const NEXT = `// app/api/reflet-devtools/[...path]/route.ts
export { GET, POST } from "reflet-sdk/devtools/next";`;

const VITE = `// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { refletDevtools } from "reflet-sdk/devtools/vite";

export default defineConfig({
  plugins: [react(), refletDevtools()],
  server: { host: "127.0.0.1" },
});`;

const OPTIONS = [
  {
    description:
      "App source directory. Defaults to process.cwd() in Next.js, config.root in Vite. The nearest ancestor containing .git bounds source reads.",
    name: "root",
    type: "string",
  },
  {
    default: "vscode",
    description: "Editor links. Can also be set with REFLET_EDITOR.",
    name: "editor",
    type: '"cursor" | "vscode" | "webstorm" | "windsurf" | "zed"',
  },
  {
    description:
      "Additional development hostnames, or comma-separated REFLET_DEVTOOLS_HOSTS. Does not make remote access safe.",
    name: "allowedHosts",
    type: "string[]",
  },
  {
    default: "Hosted API",
    description:
      "Reflet API origin, or REFLET_API_URL. Use for a self-hosted backend.",
    name: "apiUrl",
    type: "string",
  },
  {
    default: "https://www.reflet.app",
    description: "Reflet web origin for member sign-in, or REFLET_APP_URL.",
    name: "appUrl",
    type: "string",
  },
  {
    description:
      "Optional board credential, or REFLET_SECRET_KEY. Stays on the server. Does not identify the member needed for sessions.",
    name: "secretKey",
    type: "string",
  },
] as const;

export default function DevtoolsPage() {
  return (
    <DocsPage
      description="Add a local source bridge to the floating widget. Use member sign-in for private feedback and review sessions."
      sections={SECTIONS}
      title="Devtools and sessions"
    >
      <DocsSection id="nextjs" sections={SECTIONS}>
        <DocsText>
          Install <code>reflet-sdk</code>, mount this client component once in
          your layout, and add the catch-all route below. You can also use the{" "}
          <DocsLink href="/docs/cli">CLI setup command</DocsLink> to add the
          integration.
        </DocsText>
        <CodeBlock code={WIDGET} />
        <CodeBlock code={NEXT} />
        <DocsText>
          Devtools load only when <code>NODE_ENV</code> is development. The
          Next.js route returns an empty 404 otherwise. The public feedback
          widget remains available in production. Set{" "}
          <code>{"devtools={false}"}</code> on the widget to hide development
          tools explicitly.
        </DocsText>
        <DocsText>
          To customize the route, export <code>GET</code> and <code>POST</code>{" "}
          from <code>createDevtoolsRoute(options)</code> instead of re-exporting
          defaults. Keep the server bound to loopback, for example{" "}
          <code>next dev --hostname 127.0.0.1</code>.
        </DocsText>
      </DocsSection>
      <DocsSection id="vite" sections={SECTIONS}>
        <DocsText>
          Mount the same React widget and add the plugin. Vite 5+ is required.
          The plugin serves <code>/api/reflet-devtools</code> in the development
          server only; it does not add a route to a production build or preview.
        </DocsText>
        <CodeBlock code={VITE} />
        <DocsText>
          Both integrations accept the options below. Vite also reads
          <code>REFLET_</code> variables from its mode-specific environment
          files. None of these secrets need a <code>VITE_</code> or{" "}
          <code>NEXT_PUBLIC_</code> prefix.
        </DocsText>
        <PropsTable props={OPTIONS} />
      </DocsSection>
      <DocsSection id="access" sections={SECTIONS}>
        <DocsList>
          <li>
            Local notes and source inspection do not require a Reflet secret
            key. A working development route is needed for source files and
            board requests.
          </li>
          <li>
            For member access, supply the public key, choose Connect in the
            devtools account footer, then approve the organization in Reflet.
            The returned <code>fb_dev_</code> credential stays on disk under{" "}
            <code>~/.reflet/devtools/</code>, scoped by app directory and API
            origin. The browser calls the local proxy, not the stored
            credential.
          </li>
          <li>
            A member connection enables private board feedback and the member's
            sessions. Disconnect revokes the stored sign-in. A secret key can
            enable board access, but cannot substitute for a member connection
            in sessions. If an explicit secret key takes precedence, remove it
            and connect as a member to record.
          </li>
          <li>
            On hosts where Connect is unavailable, sessions can use an existing
            machine account offered by the panel. This does not give that app
            board access. Do not add a secret key just to make sessions work.
          </li>
        </DocsList>
        <DocsText>
          Production team tools are separate from devtools. Open your app with{" "}
          <code>?reflet-team</code> (or <code>&amp;reflet-team</code> if it
          already has a query), then sign in as an organization member. A valid
          stored sign-in also reopens them. The URL flag only reveals the
          sign-in UI; it grants no access. Browser team access uses an
          origin-bound <code>fb_team_</code> token stored in localStorage and
          exposes sessions, not source inspection or the board inbox. Set{" "}
          <code>{"teamTools={false}"}</code> to disable that surface.
        </DocsText>
        <DocsText>
          Customer <code>userToken</code> is not a team credential. Desktop apps
          without a usable web origin need the{" "}
          <DocsLink href="/docs/sdk/desktop-live#desktop">
            privileged desktop bridge
          </DocsLink>
          . See{" "}
          <DocsLink href="/docs/widget/floating-feedback">
            widget options
          </DocsLink>{" "}
          for placement, disabling the public trigger, and capture settings.
        </DocsText>
      </DocsSection>
      <DocsSection id="notes" sections={SECTIONS}>
        <DocsText>
          Pick an element to leave a note or inspect its React owners and
          source. Source lookup needs development debug frames. Reads stay
          inside the detected repository, exclude node_modules, allow source
          extensions only, and reject files over 1 MiB.
        </DocsText>
        <DocsText>
          Notes and element close-ups first stay in this origin's IndexedDB.
          Review them before using the panel's board-send or agent-copy actions.
          Sending creates internal feedback with page context and the selected
          element, then uploads its close-up. If a close-up fails, the feedback
          can already exist; retry the attachment rather than filing it again.
          Clearing notes archives them locally; restore them before they are
          purged after a day.
        </DocsText>
      </DocsSection>
      <DocsSection id="sessions" sections={SECTIONS}>
        <DocsText>
          Open Sessions after member sign-in and choose Start session. Recording
          requires microphone permission, a secure context (HTTPS or localhost),
          and working browser storage. No recording begins just from mounting
          the widget. A session is private to its author until they choose to
          share it with their team.
        </DocsText>
        <DocsList>
          <li>
            During recording, Reflet collects microphone audio, the current page
            URL and title, viewport and scroll position, clicks, pointed-at
            elements, marks, and screenshots. It also collects visible element
            names and positions for screenshot context. Devtools can include
            source locations; production team sessions do not.
          </li>
          <li>
            It does not record keystrokes, network calls, or other tabs and
            apps. Form values are blanked in session screenshots. Password and
            credit-card fields and elements marked{" "}
            <code>data-reflet-redact</code> are hidden. Other visible text,
            including rich-text editors, can remain in screenshots. Mark
            sensitive regions explicitly.
          </li>
          <li>
            Session page context masks sensitive-looking URL parameter values
            and removes fragments.
          </li>
          <li>
            Audio and evidence upload to Reflet while recording, with an
            IndexedDB outbox for pending work. Pausing stops new collection;
            pending uploads can still finish. In-app recording pauses when its
            tab is hidden. Interrupted drafts can be resumed; storage exhaustion
            or capture limits stop further collection.
          </li>
          <li>
            Audio is sent to ElevenLabs Scribe through OpenRouter with
            zero-data-retention requested. Reflet deletes uploaded audio after
            transcription and expires remaining audio after 24 hours. Text and
            evidence remain for review. Optional speaker detection streams audio
            to Mistral (Voxtral); the in-app disclosure states retention of up
            to 30 days with no training.
          </li>
          <li>
            The current in-app limits are 30 active minutes, 400 audio segments,
            60 screenshots, 5,000 events, and a 60 MB local pending buffer. The
            backend supplies the actual limits. Self-hosted transcription and
            analysis require provider configuration.
          </li>
        </DocsList>
        <CodeBlock
          code={`<section data-reflet-redact>
  Sensitive account information
</section>`}
        />
        <DocsText>
          Finish the recording, check the transcript and captured moments, then
          review the suggested intentions. Keeping an intention does not create
          a feedback item or start an agent. Use the explicit board action to
          add it to the board. To brief an agent, choose kept intentions and
          evidence, review the preview, then choose Copy brief or Download .zip.
          The ZIP contains the brief and selected image files. Recording and AI
          processing already send data to Reflet; the separate agent handoff
          happens only when you copy, download, or opt into the{" "}
          <DocsLink href="/docs/cli">Live workflow</DocsLink>.
        </DocsText>
        <DocsText>
          Sharing a session with the team is not the same as exporting a brief.
          Sign out to remove this account's local session data; delete a session
          through its review controls to remove the server record. For the wider
          review workflow, see{" "}
          <DocsLink href="/docs/using-reflet">using Reflet</DocsLink>.
        </DocsText>
      </DocsSection>
      <DocsSection id="troubleshooting" sections={SECTIONS}>
        <DocsList>
          <li>
            Missing route: check the exact catch-all Next.js path or Vite
            plugin, restart the development server, and confirm the widget is
            running in development mode.
          </li>
          <li>
            403 from the development route: use localhost or explicitly allow
            your dev hostname. The route checks Host, the SDK's custom request
            header, and same-origin fetch metadata. Do not expose the Next.js
            development server on a public interface; Vite additionally rejects
            non-loopback peers.
          </li>
          <li>
            Connect unavailable: use a supported local hostname with a public
            key, or the offered machine account for sessions. An allowed custom
            hostname is not automatically eligible for browser Connect.
          </li>
          <li>
            No source location: inspect a development React element, check root,
            and avoid expecting node_modules or production frames to resolve.
          </li>
          <li>
            Recording cannot start: allow microphone access and site data, check
            HTTPS/localhost, and sign in again if access was revoked. Keep
            pending-upload status visible before closing the page.
          </li>
        </DocsList>
      </DocsSection>
    </DocsPage>
  );
}
