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
import type { PropDefinition } from "@/components/docs/props-table";
import { PropsTable } from "@/components/docs/props-table";
import { InlineCode } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "A feedback card with a corner vote badge and sweep animation effect.",
  path: "/docs/components/feedback-cards/sweep-corner",
  title: "Sweep Corner - Feedback Card",
});

const SOURCE_CODE = readFileSync(
  join(process.cwd(), "../../packages/ui/registry/feedback-sweep-corner.tsx"),
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

const SUBCOMPONENTS: {
  description: string;
  name: string;
  props: PropDefinition[];
}[] = [
  {
    description: "Root provider. Manages vote state via React context.",
    name: "SweepCorner",
    props: [
      {
        description: "Initial upvote count.",
        name: "defaultUpvotes",
        required: true,
        type: "number",
      },
      {
        description: "Initial downvote count.",
        name: "defaultDownvotes",
        required: true,
        type: "number",
      },
      {
        description: "Callback fired when the vote changes.",
        name: "onVoteChange",
        required: false,
        type: "(voteType: VoteType) => void",
      },
    ],
  },
  {
    description:
      "Card container with rounded border, hover shadow, and transition.",
    name: "SweepCornerCard",
    props: [],
  },
  {
    description:
      "Content area with padding. Leaves right padding for the badge.",
    name: "SweepCornerContent",
    props: [],
  },
  {
    description: "Heading rendered as an h3.",
    name: "SweepCornerTitle",
    props: [],
  },
  {
    description: "Flex-wrap container for tag pills.",
    name: "SweepCornerTags",
    props: [],
  },
  {
    description: "Individual colored tag pill.",
    name: "SweepCornerTag",
    props: [
      {
        description:
          "Color key: blue, brown, green, orange, pink, purple, red, yellow, gray, or default.",
        name: "color",
        required: true,
        type: "string",
      },
    ],
  },
  {
    description:
      "Corner vote badge with animated up/down buttons and net count. Reads vote state from context.",
    name: "SweepCornerBadge",
    props: [],
  },
  {
    description:
      "Footer with comment count, time, vote stats, and sweep animation on vote.",
    name: "SweepCornerFooter",
    props: [
      {
        description: "Comment count.",
        name: "comments",
        required: true,
        type: "number",
      },
      {
        description: 'Relative time string, e.g. "3 days ago".',
        name: "time",
        required: true,
        type: "string",
      },
    ],
  },
];

export default function SweepCornerPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-foreground leading-snug tracking-tight">
        Sweep Corner
      </h1>
      <p className="mb-8 text-base text-muted-foreground sm:text-xl">
        A feedback card with a corner vote badge featuring animated up/down
        buttons and a gradient sweep effect on vote.
      </p>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-foreground leading-snug tracking-tight">
          Preview
        </h2>
        <ComponentPreview code={`${IMPORT_CODE}\n\n${SWEEP_CORNER_CODE}`}>
          <SweepCornerPreview />
        </ComponentPreview>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-foreground leading-snug tracking-tight">
          Installation
        </h2>
        <InstallTabs
          cliCommand="npx shadcn add https://www.reflet.app/r/feedback-sweep-corner.json"
          manualCode={SOURCE_CODE}
        />
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-foreground leading-snug tracking-tight">
          Usage
        </h2>
        <CodeBlock code={IMPORT_CODE} />
        <div className="h-4" />
        <CodeBlock code={SWEEP_CORNER_CODE} />
      </section>

      <section>
        <h2 className="mb-4 font-display text-2xl text-foreground leading-snug tracking-tight">
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
              {comp.props.length > 0 && <PropsTable props={comp.props} />}
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
