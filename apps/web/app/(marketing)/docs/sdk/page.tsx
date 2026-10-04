import type { Metadata } from "next";

import { CodeBlock } from "@/components/docs/code-block";
import { DocsCardGrid } from "@/components/docs/docs-card-grid";
import { DocsList, DocsPage, DocsSection } from "@/components/docs/docs-page";
import { InstallCommand } from "@/components/docs/install-command";
import { InlineCode } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "The official Reflet SDK for integrating feedback collection, voting, and roadmaps into your app.",
  keywords: ["sdk", "api", "react hooks", "integration"],
  path: "/docs/sdk",
  title: "SDK overview",
});

const SECTIONS = [
  { id: "features", label: "Features" },
  { id: "quick-start", label: "Quick start" },
  { id: "learn-more", label: "Learn more" },
] as const;

const USAGE = `import { Reflet } from "reflet-sdk";

const reflet = new Reflet({
  publicKey: "fb_pub_xxx",
  user: { id: "user_123", email: "user@example.com" },
});

// List feedback
const { items } = await reflet.list({ status: "open" });

// Vote
await reflet.vote("feedback_id");

// Submit feedback
await reflet.create({
  title: "Add dark mode",
  description: "Please add a dark mode option.",
});`;

const NEXT_STEPS = [
  {
    description: "Setup, configuration and SSO user signing.",
    href: "/docs/sdk/installation",
    title: "Installation",
  },
  {
    description: "Provider setup and every available hook.",
    href: "/docs/sdk/react-hooks",
    title: "React hooks",
  },
  {
    description:
      "In-app NPS, CSAT and custom surveys, triggers and custom UIs.",
    href: "/docs/sdk/surveys",
    title: "Surveys",
  },
] as const;

export default function SdkOverviewPage() {
  return (
    <DocsPage
      description={
        <>
          The official SDK for bringing Reflet feedback into your application.
          Published on npm as <InlineCode>reflet-sdk</InlineCode>.
        </>
      }
      sections={SECTIONS}
      title="Reflet SDK"
    >
      <DocsSection id="features" sections={SECTIONS}>
        <DocsList>
          <li>List, create and vote on feedback</li>
          <li>Manage comments and subscriptions</li>
          <li>Show in-app surveys with branching, targeting and custom UIs</li>
          <li>Fetch roadmap lanes and changelog entries</li>
          <li>React hooks with caching and optimistic updates</li>
          <li>Server-side user signing for secure SSO</li>
          <li>Written in TypeScript, fully typed</li>
        </DocsList>
      </DocsSection>

      <DocsSection id="quick-start" sections={SECTIONS}>
        <InstallCommand command="npm install reflet-sdk" />
        <CodeBlock code={USAGE} title="Basic usage" />
      </DocsSection>

      <DocsSection id="learn-more" sections={SECTIONS}>
        <DocsCardGrid headingLevel="h3" items={NEXT_STEPS} />
      </DocsSection>
    </DocsPage>
  );
}
