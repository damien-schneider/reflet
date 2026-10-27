import type { Metadata } from "next";
import { CodeBlock } from "@/components/docs/code-block";
import { DocsCardGrid } from "@/components/docs/docs-card-grid";
import {
  DocsLink,
  DocsPage,
  DocsSection,
  DocsText,
} from "@/components/docs/docs-page";
import { InstallCommand } from "@/components/docs/install-command";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Choose a Reflet SDK integration for feedback, React, surveys, or team tools.",
  path: "/docs/sdk",
  title: "Reflet SDK",
});

const SECTIONS = [
  { id: "quick-start", label: "Submit feedback" },
  { id: "guides", label: "Choose an integration" },
  { id: "entry-points", label: "Package entry points" },
] as const;

const QUICKSTART = `import { Reflet } from "reflet-sdk";

const reflet = new Reflet({ publicKey: "fb_pub_YOUR_PUBLIC_KEY" });

const { feedbackId, isApproved } = await reflet.create({
  title: "Keep filters when returning to the list",
  description: "Opening an item and going back resets my filters.",
});

const { items, total, hasMore } = await reflet.list({
  sortBy: "newest",
  limit: 20,
});`;

const GUIDES = [
  {
    description:
      "Configure a public key and sign trusted users on your server.",
    href: "/docs/sdk/installation",
    title: "Installation and identity",
  },
  {
    description:
      "Read feedback, submit reports, vote, comment, and handle failures.",
    href: "/docs/sdk/client",
    title: "Client methods",
  },
  {
    description:
      "Use a provider, queries, and mutations in your own interface.",
    href: "/docs/sdk/react-hooks",
    title: "React hooks",
  },
  {
    description: "Deliver surveys or render a response with your own UI.",
    href: "/docs/sdk/surveys",
    title: "Surveys",
  },
  {
    description: "Connect Next.js or Vite, take notes, and record a review.",
    href: "/docs/sdk/devtools",
    title: "Devtools and sessions",
  },
  {
    description: "Bridge desktop team tools or consume the local Live hub.",
    href: "/docs/sdk/desktop-live",
    title: "Desktop and Live",
  },
] as const;

export default function SdkOverviewPage() {
  return (
    <DocsPage
      description="The npm package for feedback clients, React interfaces, surveys, and team tools. Import only the entry point your integration needs."
      sections={SECTIONS}
      title="Reflet SDK"
    >
      <DocsSection id="quick-start" sections={SECTIONS}>
        <InstallCommand command="npm install reflet-sdk" />
        <DocsText>
          Create an API key in your organization's settings and allow your app's
          origin. Replace the public key below. This example can submit
          anonymously; voting, comments, and subscriptions need a server-signed
          user token.
        </DocsText>
        <CodeBlock code={QUICKSTART} />
        <DocsText>
          Check <code>isApproved</code> before promising that a report is
          public. See{" "}
          <DocsLink href="/docs/sdk/client#errors">error handling</DocsLink> for
          rejected requests and network failures.
        </DocsText>
      </DocsSection>
      <DocsSection id="guides" sections={SECTIONS}>
        <DocsCardGrid headingLevel="h3" items={GUIDES} />
      </DocsSection>
      <DocsSection id="entry-points" sections={SECTIONS}>
        <DocsText>
          <code>reflet-sdk</code> exports the client, public types, and error
          classes. <code>reflet-sdk/server</code> exports token signing and
          verification. <code>reflet-sdk/react</code> adds the provider, hooks,
          feedback components, changelog component, and survey delivery.
        </DocsText>
        <DocsText>
          For ready-made UI, use <code>reflet-sdk/feedback</code> for the{" "}
          <DocsLink href="/docs/widget/floating-feedback">
            floating widget
          </DocsLink>
          , or see the{" "}
          <DocsLink href="/docs/widget/feedback-widget">
            feedback components
          </DocsLink>{" "}
          and{" "}
          <DocsLink href="/docs/widget/changelog-widget">
            changelog widget
          </DocsLink>
          . The feedback entry also exports capture helpers and team-bridge
          types.
          <code>reflet-sdk/surveys</code> provides survey rendering without
          automatic delivery.
        </DocsText>
        <DocsText>
          <code>reflet-sdk/devtools/next</code> and{" "}
          <code>reflet-sdk/devtools/vite</code> run on a development server.
          <code>reflet-sdk/desktop</code> and <code>reflet-sdk/live-hub</code>{" "}
          are privileged Node integrations, not browser imports. For operating
          Live rather than embedding its hub, use the{" "}
          <DocsLink href="/docs/cli">CLI guide</DocsLink>.
        </DocsText>
      </DocsSection>
    </DocsPage>
  );
}
