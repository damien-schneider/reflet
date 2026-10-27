import {
  DocsLink,
  DocsList,
  DocsSection,
  DocsText,
} from "@/components/docs/docs-page";
import { SECTIONS } from "./sections";

export function DevtoolsSection() {
  return (
    <DocsSection id="devtools" sections={SECTIONS}>
      <DocsText>
        In development, RefletFeedback can load a toolbar for element notes,
        source lookup, the page's feedback and sessions. Development tools are
        guarded by NODE_ENV. Source and account actions also need a server
        integration; mounting the widget alone does not install it.
      </DocsText>
      <DocsText>
        Follow the <DocsLink href="/docs/sdk/devtools">devtools setup</DocsLink>{" "}
        for Next.js or Vite. Keep its server route on a trusted local
        development server: it can read source files and perform account
        actions.
      </DocsText>
    </DocsSection>
  );
}

export function SessionsSection() {
  return (
    <DocsSection id="sessions" sections={SECTIONS}>
      <DocsText>
        For team access on a deployed web app, keep teamTools enabled and open a
        page with ?reflet-team. Sign in to Reflet and approve the app. The
        activation makes the sign-in UI available; organization membership is
        checked by the server, not by the URL parameter or your app's user prop.
      </DocsText>
      <DocsList>
        <li>
          Add the app's exact origin to the public key's Allowed domains. A key
          with no allowed origins cannot authorize deployed team access.
        </li>
        <li>
          Team access uses your Reflet account, not your product's customer
          identity. A stored team connection can activate tools on later visits.
        </li>
        <li>
          Set teamTools=false to remove deployed team tools. enabled=false only
          controls the customer report UI.
        </li>
      </DocsList>
      <DocsText>
        For recording permissions, collection, storage and handoff, read{" "}
        <DocsLink href="/docs/sdk/devtools#sessions">sessions</DocsLink>.
        Desktop hosts use the{" "}
        <DocsLink href="/docs/sdk/desktop-live">desktop integration</DocsLink>{" "}
        rather than browser popup sign-in.
      </DocsText>
    </DocsSection>
  );
}
