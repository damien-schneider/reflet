import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Metadata } from "next";

import {
  CodeBlock,
  ComponentPreview,
  InstallTabs,
} from "@/components/docs/component-preview";
import { EDITORIAL_FEED_CODE } from "@/components/docs/feedback-card-codes";
import { EditorialFeedPreview } from "@/components/docs/feedback-card-previews";
import { InlineCode } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  title: "Editorial Feed - Feedback Card",
  description:
    "A rich editorial feedback layout with margin vote annotations and stacked list items.",
  path: "/docs/components/feedback-cards/editorial-feed",
});

const SOURCE_CODE = readFileSync(
  join(process.cwd(), "../../packages/ui/registry/feedback-editorial-feed.tsx"),
  "utf-8"
);

const IMPORT_CODE = `import {
  EditorialFeed,
  EditorialFeedComments,
  EditorialFeedContent,
  EditorialFeedItem,
  EditorialFeedMeta,
  EditorialFeedRule,
  EditorialFeedStatus,
  EditorialFeedTag,
  EditorialFeedTime,
  EditorialFeedTitle,
  EditorialFeedVote,
} from "@/components/ui/feedback-editorial-feed";`;

const SUBCOMPONENTS = [
  {
    name: "EditorialFeed",
    description: "List container with vertical dividers between items.",
    props: [],
  },
  {
    name: "EditorialFeedItem",
    description:
      "Individual feed item. Provides vote context for child sub-components.",
    props: [
      {
        name: "defaultUpvotes",
        type: "number",
        required: false,
        description: "Initial upvote count. Defaults to 0.",
      },
      {
        name: "defaultDownvotes",
        type: "number",
        required: false,
        description: "Initial downvote count. Defaults to 0.",
      },
      {
        name: "onVoteChange",
        type: "(upvotes, downvotes) => void",
        required: false,
        description: "Callback fired when the vote changes.",
      },
    ],
  },
  {
    name: "EditorialFeedVote",
    description:
      "Absolute-positioned vote annotation in the left margin with animated up/down buttons.",
    props: [],
  },
  {
    name: "EditorialFeedRule",
    description:
      "Thin vertical rule separating the vote margin from the content.",
    props: [],
  },
  {
    name: "EditorialFeedContent",
    description: "Wrapper for the title and meta content area.",
    props: [],
  },
  {
    name: "EditorialFeedTitle",
    description: "Editorial-style heading with display font.",
    props: [],
  },
  {
    name: "EditorialFeedMeta",
    description: "Flex row for status, tags, comments, and time metadata.",
    props: [],
  },
  {
    name: "EditorialFeedStatus",
    description: "Colored status badge pill.",
    props: [
      {
        name: "color",
        type: "StatusColor",
        required: false,
        description:
          'Color key: purple, green, blue, red, amber, pink, or gray. Defaults to "gray".',
      },
    ],
  },
  {
    name: "EditorialFeedTag",
    description: "Italic tag prefixed with #.",
    props: [],
  },
  {
    name: "EditorialFeedComments",
    description: "Comment count with dot separator.",
    props: [
      {
        name: "count",
        type: "number",
        required: true,
        description: "Number of comments.",
      },
    ],
  },
  {
    name: "EditorialFeedTime",
    description: "Italic timestamp text.",
    props: [],
  },
] as const;

export default function EditorialFeedPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
        Editorial Feed
      </h1>
      <p className="mb-8 text-base text-muted-foreground sm:text-xl">
        A rich editorial layout with margin vote annotations, vertical rules,
        and stacked feed items. Inspired by blog and editorial design.
      </p>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Preview
        </h2>
        <ComponentPreview code={`${IMPORT_CODE}\n\n${EDITORIAL_FEED_CODE}`}>
          <EditorialFeedPreview />
        </ComponentPreview>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Installation
        </h2>
        <InstallTabs
          cliCommand="npx shadcn add https://reflet.app/r/feedback-editorial-feed.json"
          manualCode={SOURCE_CODE}
        />
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Usage
        </h2>
        <CodeBlock code={IMPORT_CODE} />
        <div className="h-4" />
        <CodeBlock code={EDITORIAL_FEED_CODE} />
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
