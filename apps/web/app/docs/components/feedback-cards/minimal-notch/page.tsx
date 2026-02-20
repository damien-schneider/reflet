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
import { InlineCode } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  title: "Minimal Notch - Feedback Card",
  description: "A minimal feedback card with a side notch vote indicator.",
  path: "/docs/components/feedback-cards/minimal-notch",
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

const SUBCOMPONENTS = [
  {
    name: "MinimalNotch",
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
        type: "(voteType, upvotes, downvotes) => void",
        required: false,
        description: "Callback fired when the vote changes.",
      },
    ],
  },
  {
    name: "MinimalNotchCard",
    description:
      "Card body with rounded border, hover shadow, and inner spacing.",
    props: [],
  },
  {
    name: "MinimalNotchTitle",
    description: "Heading rendered as an h3.",
    props: [],
  },
  {
    name: "MinimalNotchStatus",
    description: "Colored status badge pill.",
    props: [
      {
        name: "color",
        type: "BadgeColor",
        required: false,
        description:
          'Color key: purple, green, blue, red, amber, pink, or gray. Defaults to "blue".',
      },
    ],
  },
  {
    name: "MinimalNotchTags",
    description: "Flex-wrap container for tags.",
    props: [],
  },
  {
    name: "MinimalNotchTag",
    description: "Individual colored tag pill.",
    props: [
      {
        name: "color",
        type: "BadgeColor",
        required: false,
        description:
          'Color key: purple, green, blue, red, amber, pink, or gray. Defaults to "gray".',
      },
    ],
  },
  {
    name: "MinimalNotchMeta",
    description: "Row with comment count and relative time.",
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
  {
    name: "MinimalNotchVote",
    description:
      "Vote column with animated notch bar, glow effect, and up/down buttons. Reads vote state from context.",
    props: [],
  },
] as const;

export default function MinimalNotchPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
        Minimal Notch
      </h1>
      <p className="mb-8 text-base text-muted-foreground sm:text-xl">
        A clean feedback card with a side vote column featuring an animated
        glowing notch bar that responds to vote state.
      </p>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Preview
        </h2>
        <ComponentPreview code={`${IMPORT_CODE}\n\n${MINIMAL_NOTCH_CODE}`}>
          <MinimalNotchPreview />
        </ComponentPreview>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Installation
        </h2>
        <InstallTabs
          cliCommand="npx shadcn add https://reflet.app/r/feedback-minimal-notch.json"
          manualCode={SOURCE_CODE}
        />
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Usage
        </h2>
        <CodeBlock code={IMPORT_CODE} />
        <div className="h-4" />
        <CodeBlock code={MINIMAL_NOTCH_CODE} />
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
