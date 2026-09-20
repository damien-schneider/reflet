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
import type { PropDefinition } from "@/components/docs/props-table";
import { PropsTable } from "@/components/docs/props-table";
import { InlineCode } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "A rich editorial feedback layout with margin vote annotations and stacked list items.",
  path: "/docs/components/feedback-cards/editorial-feed",
  title: "Editorial Feed - Feedback Card",
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

const SUBCOMPONENTS: {
  description: string;
  name: string;
  props: PropDefinition[];
}[] = [
  {
    description: "List container with vertical dividers between items.",
    name: "EditorialFeed",
    props: [],
  },
  {
    description:
      "Individual feed item. Provides vote context for child sub-components.",
    name: "EditorialFeedItem",
    props: [
      {
        description: "Initial upvote count. Defaults to 0.",
        name: "defaultUpvotes",
        required: false,
        type: "number",
      },
      {
        description: "Initial downvote count. Defaults to 0.",
        name: "defaultDownvotes",
        required: false,
        type: "number",
      },
      {
        description: "Callback fired when the vote changes.",
        name: "onVoteChange",
        required: false,
        type: "(upvotes, downvotes) => void",
      },
    ],
  },
  {
    description:
      "Absolute-positioned vote annotation in the left margin with animated up/down buttons.",
    name: "EditorialFeedVote",
    props: [],
  },
  {
    description:
      "Thin vertical rule separating the vote margin from the content.",
    name: "EditorialFeedRule",
    props: [],
  },
  {
    description: "Wrapper for the title and meta content area.",
    name: "EditorialFeedContent",
    props: [],
  },
  {
    description: "Editorial-style heading with display font.",
    name: "EditorialFeedTitle",
    props: [],
  },
  {
    description: "Flex row for status, tags, comments, and time metadata.",
    name: "EditorialFeedMeta",
    props: [],
  },
  {
    description: "Colored status badge pill.",
    name: "EditorialFeedStatus",
    props: [
      {
        description:
          'Color key: blue, brown, green, orange, pink, purple, red, yellow, gray, or default. Defaults to "gray".',
        name: "color",
        required: false,
        type: "StatusColor",
      },
    ],
  },
  {
    description: "Italic tag prefixed with #.",
    name: "EditorialFeedTag",
    props: [],
  },
  {
    description: "Comment count with dot separator.",
    name: "EditorialFeedComments",
    props: [
      {
        description: "Number of comments.",
        name: "count",
        required: true,
        type: "number",
      },
    ],
  },
  {
    description: "Italic timestamp text.",
    name: "EditorialFeedTime",
    props: [],
  },
];

export default function EditorialFeedPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-foreground leading-snug tracking-tight">
        Editorial Feed
      </h1>
      <p className="mb-8 text-base text-muted-foreground sm:text-xl">
        A rich editorial layout with margin vote annotations, vertical rules,
        and stacked feed items. Inspired by blog and editorial design.
      </p>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-foreground leading-snug tracking-tight">
          Preview
        </h2>
        <ComponentPreview code={`${IMPORT_CODE}\n\n${EDITORIAL_FEED_CODE}`}>
          <EditorialFeedPreview />
        </ComponentPreview>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-foreground leading-snug tracking-tight">
          Installation
        </h2>
        <InstallTabs
          cliCommand="npx shadcn add https://www.reflet.app/r/feedback-editorial-feed.json"
          manualCode={SOURCE_CODE}
        />
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-foreground leading-snug tracking-tight">
          Usage
        </h2>
        <CodeBlock code={IMPORT_CODE} />
        <div className="h-4" />
        <CodeBlock code={EDITORIAL_FEED_CODE} />
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
