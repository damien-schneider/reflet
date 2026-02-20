import type { Metadata } from "next";

import { InlineCode } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  title: "Component Installation",
  description:
    "How to install Reflet UI components into your project using the shadcn registry.",
  path: "/docs/components/installation",
});

export default function InstallationPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
        Installation
      </h1>
      <p className="mb-8 text-base text-muted-foreground sm:text-xl">
        Add Reflet UI components to any project that uses shadcn/ui.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Prerequisites
        </h2>
        <ul className="list-inside list-disc space-y-2 text-muted-foreground text-sm">
          <li>
            A project with{" "}
            <a
              className="font-medium text-foreground underline underline-offset-4"
              href="https://ui.shadcn.com/docs/installation"
              rel="noopener noreferrer"
              target="_blank"
            >
              shadcn/ui initialized
            </a>
          </li>
          <li>React 18 or 19</li>
          <li>Tailwind CSS v4</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Install a component
        </h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Use the shadcn CLI to install components directly from the Reflet
          registry:
        </p>
        <div className="space-y-3">
          <CodeBlock
            command="npx shadcn add https://reflet.app/r/feedback-sweep-corner.json"
            label="Sweep Corner"
          />
          <CodeBlock
            command="npx shadcn add https://reflet.app/r/feedback-minimal-notch.json"
            label="Minimal Notch"
          />
          <CodeBlock
            command="npx shadcn add https://reflet.app/r/feedback-editorial-feed.json"
            label="Editorial Feed"
          />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          What gets installed
        </h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Each command creates a component file in your{" "}
          <InlineCode>components/ui/</InlineCode> directory. The component is
          fully self-contained — no external runtime dependencies beyond what
          shadcn already provides.
        </p>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <pre className="text-muted-foreground text-sm">
            {`components/
  ui/
    feedback-sweep-corner.tsx    ← installed component
    feedback-minimal-notch.tsx
    feedback-editorial-feed.tsx`}
          </pre>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Usage
        </h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Import and use the component with your data:
        </p>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <pre className="overflow-x-auto text-sm">
            {`import { FeedbackSweepCorner } from "@/components/ui/feedback-sweep-corner";

const item = {
  id: "1",
  title: "Add dark mode support",
  description: "Would love to see a dark mode option.",
  status: "planned",
  voteCount: 42,
  commentCount: 7,
  hasVoted: false,
  createdAt: Date.now() - 86400000,
  tags: [{ id: "1", name: "UI", color: "blue" }],
  organizationStatus: { id: "s1", name: "Planned", color: "purple" },
  author: { name: "Jane", isExternal: true },
};

<FeedbackSweepCorner
  item={item}
  onVote={(id) => console.log("voted", id)}
/>`}
          </pre>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Connecting to Reflet SDK
        </h2>
        <p className="text-muted-foreground text-sm">
          These components are presentational — they accept data via props and
          don&apos;t depend on any backend. To connect them to live Reflet data,
          use the{" "}
          <a
            className="font-medium text-foreground underline underline-offset-4"
            href="/docs/sdk"
          >
            Reflet SDK
          </a>{" "}
          hooks like <InlineCode>useFeedbackList()</InlineCode> and pass the
          items as props.
        </p>
      </section>
    </div>
  );
}

function CodeBlock({ label, command }: { label: string; command: string }) {
  return (
    <div>
      <p className="mb-1 font-medium text-foreground text-xs">{label}</p>
      <div className="rounded-lg bg-muted px-4 py-3">
        <code className="text-muted-foreground text-sm">{command}</code>
      </div>
    </div>
  );
}
