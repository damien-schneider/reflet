import type { Metadata } from "next";
import Link from "next/link";

import { InlineCode } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  title: "SDK Overview",
  description:
    "The official Reflet SDK for integrating feedback collection, voting, and roadmaps into your app.",
  path: "/docs/sdk",
  keywords: ["sdk", "api", "react hooks", "integration"],
});

export default function SdkOverviewPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
        Reflet SDK
      </h1>
      <p className="mb-8 text-base text-muted-foreground sm:text-xl">
        The official SDK for integrating Reflet feedback collection into your
        application. Available as <InlineCode>reflet-sdk</InlineCode> on npm.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Features
        </h2>
        <ul className="list-inside list-disc space-y-2 text-muted-foreground text-sm">
          <li>List, create, and vote on feedback</li>
          <li>Manage comments and subscriptions</li>
          <li>Fetch roadmap lanes and changelog entries</li>
          <li>React hooks with automatic caching and optimistic updates</li>
          <li>Server-side user signing for secure SSO</li>
          <li>TypeScript-first with full type coverage</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Quick start
        </h2>
        <div className="space-y-4">
          <div>
            <p className="mb-1 font-medium text-foreground text-xs">Install</p>
            <div className="rounded-lg bg-muted px-4 py-3">
              <code className="text-muted-foreground text-sm">
                npm install reflet-sdk
              </code>
            </div>
          </div>
          <div>
            <p className="mb-1 font-medium text-foreground text-xs">
              Basic usage
            </p>
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <pre className="overflow-x-auto text-sm">
                {`import { Reflet } from "reflet-sdk";

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
});`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Learn more
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            className="rounded-lg border border-border p-4 transition-colors hover:bg-accent/30"
            href="/docs/sdk/installation"
          >
            <h3 className="mb-1 font-semibold text-sm">Installation</h3>
            <p className="text-muted-foreground text-xs">
              Setup, configuration, and SSO user signing.
            </p>
          </Link>
          <Link
            className="rounded-lg border border-border p-4 transition-colors hover:bg-accent/30"
            href="/docs/sdk/react-hooks"
          >
            <h3 className="mb-1 font-semibold text-sm">React Hooks</h3>
            <p className="text-muted-foreground text-xs">
              Provider setup and all available hooks.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
