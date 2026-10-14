import { CodeBlock } from "@/components/docs/code-block";
import { DocsList, DocsSection, DocsText } from "@/components/docs/docs-page";
import { InlineCode } from "@/components/ui/typography";
import { SECTIONS } from "./sections";

const DEVTOOLS_ROUTE_SNIPPET = `// Next.js: app/api/reflet-devtools/[...path]/route.ts
import { createDevtoolsRoute } from "reflet-sdk/devtools/next";
export const { GET, POST } = createDevtoolsRoute();

// package.json: a route handler cannot see who calls it, so stay on loopback.
// Binding another host on purpose (Docker, phone testing) exposes the route to that network.
"dev": "next dev -H 127.0.0.1"

// Vite: vite.config.ts
import { refletDevtools } from "reflet-sdk/devtools/vite";
export default defineConfig({ plugins: [react(), refletDevtools()] });`;

export function DevtoolsSection() {
  return (
    <DocsSection id="devtools" sections={SECTIONS}>
      <DocsText>
        On your dev server, the same component adds a small bar above the
        launcher that you can drag anywhere. Pick an element to write a note on
        it, press ⌘C to copy it with its source, or Shift-click it to open its
        source with the JSX highlighted. Copy your notes as one prompt for a
        coding agent, or add them to the board as internal feedback that only
        members see. The Board tab lists the feedback reported on the current
        page, with the element and its code one click away. Production builds
        never ship it.
      </DocsText>
      <DocsText>
        Code view, the board, Connect and sessions go through one dev-only
        route. To reach the board, click Connect to Reflet in the panel footer
        and approve your dev server on reflet.app: it keeps a revocable token
        outside your repository. You can also set{" "}
        <InlineCode>REFLET_SECRET_KEY</InlineCode> on the server instead. Set{" "}
        <InlineCode>REFLET_EDITOR</InlineCode> to{" "}
        <InlineCode>cursor</InlineCode>, <InlineCode>zed</InlineCode>,{" "}
        <InlineCode>windsurf</InlineCode> or <InlineCode>webstorm</InlineCode>{" "}
        for the editor links.
      </DocsText>
      <CodeBlock code={DEVTOOLS_ROUTE_SNIPPET} />
    </DocsSection>
  );
}

export function SessionsSection() {
  return (
    <DocsSection id="sessions" sections={SECTIONS}>
      <DocsText>
        Talk through your app while you use it. A session records your voice,
        what you point at and mark, and a screenshot at the start, at each mark
        and on each page change. When you finish, Reflet transcribes it and
        proposes the changes you asked for, each with the quotes and screenshots
        behind it. Keep the ones you want, then copy them as a brief for a
        coding agent, export a .zip with the screenshots, or create internal
        feedback.
      </DocsText>
      <DocsText>
        On your dev server, sessions live in the devtools Sessions tab. On a
        deployed app, open any page with <InlineCode>?reflet-team</InlineCode>,
        sign in with Reflet and approve the app: members of your organization
        get the same tools, your users never see them.
      </DocsText>
      <DocsList>
        <li>
          The widget’s public key must list the app’s exact origin under Allowed
          domains. A key without allowed domains signs no one in.
        </li>
        <li>
          The page must allow the microphone. A{" "}
          <InlineCode>Permissions-Policy</InlineCode> header with{" "}
          <InlineCode>microphone=()</InlineCode> blocks it; use{" "}
          <InlineCode>microphone=(self)</InlineCode>.
        </li>
        <li>
          Pause stops all collection. Keystrokes are never recorded, form fields
          appear empty in screenshots, and password fields and{" "}
          <InlineCode>data-reflet-redact</InlineCode> elements are left out.
        </li>
        <li>
          Voice is transcribed with zero data retention, and the audio is
          deleted once transcribed, within 24 hours at most.
        </li>
      </DocsList>
    </DocsSection>
  );
}
