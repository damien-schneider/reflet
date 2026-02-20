import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Metadata } from "next";

import {
  CodeBlock,
  ComponentPreview,
  InstallTabs,
} from "@/components/docs/component-preview";
import { SWEEP_CORNER_CODE } from "@/components/docs/feedback-card-codes";
import { SweepCornerPreview } from "@/components/docs/feedback-card-previews";
import { InlineCode } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  title: "Sweep Corner - Feedback Card",
  description:
    "A feedback card with a corner vote badge and sweep animation effect.",
  path: "/docs/components/feedback-cards/sweep-corner",
});

const SOURCE_CODE = readFileSync(
  join(process.cwd(), "src/components/ui/feedback-sweep-corner.tsx"),
  "utf-8"
);

const IMPORT_CODE = `import {
  SweepCorner,
  SweepCornerBadge,
  SweepCornerCard,
  SweepCornerContent,
  SweepCornerFooter,
  SweepCornerTag,
  SweepCornerTags,
  SweepCornerTitle,
} from "@/components/ui/feedback-sweep-corner";`;

const SUBCOMPONENTS = [
  {
    name: "SweepCorner",
    description: "Root provider. Manages vote state via React context.",
    props: [
      {
        name: "defaultUpvotes",
        type: "number",
        required: true,
        description: "Initial upvote count.",
      },
      {
        name: "defaultDownvotes",
        type: "number",
        required: true,
        description: "Initial downvote count.",
      },
      {
        name: "onVoteChange",
        type: "(voteType: VoteType) => void",
        required: false,
        description: "Callback fired when the vote changes.",
      },
    ],
  },
  {
    name: "SweepCornerCard",
    description:
      "Card container with rounded border, hover shadow, and transition.",
    props: [],
  },
  {
    name: "SweepCornerContent",
    description:
      "Content area with padding. Leaves right padding for the badge.",
    props: [],
  },
  {
    name: "SweepCornerTitle",
    description: "Heading rendered as an h3.",
    props: [],
  },
  {
    name: "SweepCornerTags",
    description: "Flex-wrap container for tag pills.",
    props: [],
  },
  {
    name: "SweepCornerTag",
    description: "Individual colored tag pill.",
    props: [
      {
        name: "color",
        type: "string",
        required: true,
        description:
          "Color key: purple, green, blue, red, amber, pink, or gray.",
      },
    ],
  },
  {
    name: "SweepCornerBadge",
    description:
      "Corner vote badge with animated up/down buttons and net count. Reads vote state from context.",
    props: [],
  },
  {
    name: "SweepCornerFooter",
    description:
      "Footer with comment count, time, vote stats, and sweep animation on vote.",
    props: [
      {
        name: "comments",
        type: "number",
        required: true,
        description: "Comment count.",
      },
      {
        name: "time",
        type: "string",
        required: true,
        description: 'Relative time string, e.g. "3 days ago".',
      },
    ],
  },
] as const;

export default function SweepCornerPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
        Sweep Corner
      </h1>
      <p className="mb-8 text-base text-muted-foreground sm:text-xl">
        A feedback card with a corner vote badge featuring animated up/down
        buttons and a gradient sweep effect on vote.
      </p>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Preview
        </h2>
        <ComponentPreview code={`${IMPORT_CODE}\n\n${SWEEP_CORNER_CODE}`}>
          <SweepCornerPreview />
        </ComponentPreview>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Installation
        </h2>
        <InstallTabs
          cliCommand="npx shadcn add https://reflet.app/r/feedback-sweep-corner.json"
          manualCode={SOURCE_CODE}
        />
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Usage
        </h2>
        <CodeBlock code={IMPORT_CODE} />
        <div className="h-4" />
        <CodeBlock code={SWEEP_CORNER_CODE} />
      </section>

      <section>
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          API Reference
        </h2>
        <div className="space-y-8">
          {SUBCOMPONENTS.map((comp) => (
            <div key={comp.name}>
              <h3 className="mb-2 font-semibold text-sm">
                <InlineCode>{comp.name}</InlineCode>
              </h3>
              <p className="mb-3 text-muted-foreground text-sm">
                {comp.description}
              </p>
              {comp.props.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-border border-b bg-muted/50">
                        <th className="px-4 py-2.5 text-left font-semibold text-xs">
                          Prop
                        </th>
                        <th className="px-4 py-2.5 text-left font-semibold text-xs">
                          Type
                        </th>
                        <th className="px-4 py-2.5 text-left font-semibold text-xs">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {comp.props.map((p) => (
                        <tr
                          className="border-border border-b last:border-0"
                          key={p.name}
                        >
                          <td className="px-4 py-2">
                            <InlineCode>{p.name}</InlineCode>
                            {p.required && (
                              <span className="ml-1 text-destructive text-xs">
                                *
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <InlineCode>{p.type}</InlineCode>
                          </td>
                          <td className="px-4 py-2 text-muted-foreground text-xs">
                            {p.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="mt-4 text-muted-foreground text-xs">
          All sub-components also accept <InlineCode>className</InlineCode> and{" "}
          <InlineCode>children</InlineCode> props unless noted otherwise.
        </p>
      </section>
    </div>
  );
}
