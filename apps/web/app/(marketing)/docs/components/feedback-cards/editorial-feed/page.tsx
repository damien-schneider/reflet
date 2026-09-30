import type { Metadata } from "next";

import { EDITORIAL_FEED_CODE } from "@/components/docs/feedback-card-codes";
import { EditorialFeedPreview } from "@/components/docs/feedback-card-previews";
import {
  RegistryDocPage,
  type Subcomponent,
} from "@/components/docs/registry-doc-page";
import { voteRootProps } from "@/components/docs/vote-root-props";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "An editorial-style feedback list with margin vote annotations and vertical rules.",
  path: "/docs/components/feedback-cards/editorial-feed",
  title: "Editorial feed – feedback card",
});

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

const FEATURES = [
  "Stacked list layout with votes set in the margin, like annotations.",
  "A vertical rule separates the vote column from the content.",
  "Each item keeps its own vote state, uncontrolled or controlled.",
] as const;

const SUBCOMPONENTS: readonly Subcomponent[] = [
  { description: "List container for feed items.", name: "EditorialFeed" },
  {
    description:
      "One feedback row. Holds that item’s vote state and shares it with EditorialFeedVote.",
    name: "EditorialFeedItem",
    props: voteRootProps({
      description: "Called with the new totals after an uncontrolled vote.",
      name: "onVoteChange",
      type: "(upvotes: number, downvotes: number) => void",
    }),
  },
  {
    description:
      "Margin vote column with up and down buttons. Reads vote state from the item.",
    name: "EditorialFeedVote",
  },
  {
    description: "Vertical rule between the vote column and the content.",
    name: "EditorialFeedRule",
  },
  { description: "Content column.", name: "EditorialFeedContent" },
  { description: "Item title.", name: "EditorialFeedTitle" },
  {
    description: "Row for status, tags, comments and time.",
    name: "EditorialFeedMeta",
  },
  {
    description: "Colored status label.",
    name: "EditorialFeedStatus",
    props: [
      {
        description: "Status color key.",
        name: "color",
        type: "StatusColor",
      },
    ],
  },
  { description: "Plain tag label.", name: "EditorialFeedTag" },
  {
    description: "Comment count.",
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
  { description: "Relative time label.", name: "EditorialFeedTime" },
];

export default function EditorialFeedPage() {
  return (
    <RegistryDocPage
      description="A stacked, editorial list of feedback with votes set in the margin and a vertical rule beside each item."
      features={FEATURES}
      importCode={IMPORT_CODE}
      preview={<EditorialFeedPreview />}
      registryName="feedback-editorial-feed"
      subcomponents={SUBCOMPONENTS}
      title="Editorial Feed"
      usageCode={EDITORIAL_FEED_CODE}
    />
  );
}
