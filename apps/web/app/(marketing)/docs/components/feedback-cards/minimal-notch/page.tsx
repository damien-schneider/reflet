import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Metadata } from "next";

import {
  CodeBlock,
  ComponentPreview,
  InstallTabs,
} from "@/components/docs/component-preview";
import { MINIMAL_NOTCH_CODE } from "@/components/docs/feedback-card-codes";
import { MinimalNotchPreview } from "@/components/docs/feedback-card-previews";
import type { PropDefinition } from "@/components/docs/props-table";
import { PropsTable } from "@/components/docs/props-table";
import { InlineCode } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description: "A minimal feedback card with a side notch vote indicator.",
  path: "/docs/components/feedback-cards/minimal-notch",
  title: "Minimal Notch - Feedback Card",
});

const SOURCE_CODE = readFileSync(
  join(process.cwd(), "../../packages/ui/registry/feedback-minimal-notch.tsx"),
  "utf-8"
);

const IMPORT_CODE = `import {
  MinimalNotch,
  MinimalNotchCard,
  MinimalNotchMeta,
  MinimalNotchStatus,
  MinimalNotchTag,
  MinimalNotchTags,
  MinimalNotchTitle,
  MinimalNotchVote,
} from "@/components/ui/feedback-minimal-notch";`;

const SUBCOMPONENTS: {
  description: string;
  name: string;
  props: PropDefinition[];
}[] = [
  {
    description: "Root provider. Manages vote state via React context.",
    name: "MinimalNotch",
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
        type: "(voteType, upvotes, downvotes) => void",
      },
    ],
  },
  {
    description:
      "Card body with rounded border, hover shadow, and inner spacing.",
    name: "MinimalNotchCard",
    props: [],
  },
  {
    description: "Heading rendered as an h3.",
    name: "MinimalNotchTitle",
    props: [],
  },
  {
    description: "Colored status badge pill.",
    name: "MinimalNotchStatus",
    props: [
      {
        description:
          'Color key: blue, brown, green, orange, pink, purple, red, yellow, gray, or default. Defaults to "blue".',
        name: "color",
        required: false,
        type: "BadgeColor",
      },
    ],
  },
  {
    description: "Flex-wrap container for tags.",
    name: "MinimalNotchTags",
    props: [],
  },
  {
    description: "Individual colored tag pill.",
    name: "MinimalNotchTag",
    props: [
      {
        description:
          'Color key: blue, brown, green, orange, pink, purple, red, yellow, gray, or default. Defaults to "gray".',
        name: "color",
        required: false,
        type: "BadgeColor",
      },
    ],
  },
  {
    description: "Row with comment count and relative time.",
    name: "MinimalNotchMeta",
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
  {
    description:
      "Vote column with animated notch bar, glow effect, and up/down buttons. Reads vote state from context.",
    name: "MinimalNotchVote",
    props: [],
  },
];

export default function MinimalNotchPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-foreground leading-snug tracking-tight">
        Minimal Notch
      </h1>
      <p className="mb-8 text-base text-muted-foreground sm:text-xl">
        A clean feedback card with a side vote column featuring an animated
        glowing notch bar that responds to vote state.
      </p>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-foreground leading-snug tracking-tight">
          Preview
        </h2>
        <ComponentPreview code={`${IMPORT_CODE}\n\n${MINIMAL_NOTCH_CODE}`}>
          <MinimalNotchPreview />
        </ComponentPreview>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-foreground leading-snug tracking-tight">
          Installation
        </h2>
        <InstallTabs
          cliCommand="npx shadcn add https://www.reflet.app/r/feedback-minimal-notch.json"
          manualCode={SOURCE_CODE}
        />
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-foreground leading-snug tracking-tight">
          Usage
        </h2>
        <CodeBlock code={IMPORT_CODE} />
        <div className="h-4" />
        <CodeBlock code={MINIMAL_NOTCH_CODE} />
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
