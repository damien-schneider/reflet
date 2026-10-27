import type { Metadata } from "next";
import {
  DocsLink,
  DocsList,
  DocsPage,
  DocsSection,
  DocsText,
} from "@/components/docs/docs-page";

export const metadata: Metadata = {
  description:
    "Use Reflet, integrate feedback into your app, or run your own deployment.",
  title: "Documentation",
};

const SECTIONS = [
  { id: "use", label: "Use Reflet" },
  { id: "integrate", label: "Integrate with your app" },
  { id: "contribute", label: "Run and contribute" },
] as const;

export default function DocsIndexPage() {
  return (
    <DocsPage
      description="Collect a request, decide what to build, and tell customers when it ships. Choose the guide for the task in front of you."
      sections={SECTIONS}
      title="Documentation"
    >
      <DocsSection id="use" sections={SECTIONS}>
        <DocsText>
          New to Reflet?{" "}
          <DocsLink href="/docs/using-reflet">Set up your workspace</DocsLink>{" "}
          and follow a request through review, planning, and release. The same
          guide covers support, surveys, status pages, and team settings.
        </DocsText>
      </DocsSection>
      <DocsSection id="integrate" sections={SECTIONS}>
        <DocsList>
          <li>
            <DocsLink href="/docs/widget">Embed a widget</DocsLink> for
            feedback, live chat, or release notes without building the
            interface.
          </li>
          <li>
            <DocsLink href="/docs/sdk/installation">Install the SDK</DocsLink>{" "}
            to build your own feedback UI in JavaScript or React, or display
            surveys.
          </li>
          <li>
            <DocsLink href="/docs/sdk/devtools">
              Add development and team tools
            </DocsLink>{" "}
            to collect notes and voice sessions with page context.
          </li>
          <li>
            <DocsLink href="/docs/components">Install UI components</DocsLink>{" "}
            for feedback cards and milestone views you own and style.
          </li>
          <li>
            <DocsLink href="/docs/api">Call the REST API</DocsLink> for
            integrations, server-side administration, and webhooks.
          </li>
          <li>
            <DocsLink href="/docs/cli">Use the CLI</DocsLink> to set up a
            project, manage feedback, or let a coding agent follow a live
            session.
          </li>
        </DocsList>
        <DocsText>
          Browser integrations use a public key. Secret keys stay on your server
          or in a trusted CLI. User identity for votes, comments, and
          subscriptions must be signed on your server; see{" "}
          <DocsLink href="/docs/sdk/installation#user-signing">
            trusted identity
          </DocsLink>
          .
        </DocsText>
      </DocsSection>
      <DocsSection id="contribute" sections={SECTIONS}>
        <DocsList>
          <li>
            <DocsLink href="https://github.com/damien-schneider/reflet/blob/main/CONTRIBUTING.md">
              Local development and contribution
            </DocsLink>
          </li>
          <li>
            <DocsLink href="https://github.com/damien-schneider/reflet/blob/main/docs/self-hosting.md">
              Deployment and self-hosting
            </DocsLink>
          </li>
          <li>
            <DocsLink href="https://github.com/damien-schneider/reflet/blob/main/docs/README.md">
              Repository documentation and design records
            </DocsLink>
          </li>
        </DocsList>
      </DocsSection>
    </DocsPage>
  );
}
