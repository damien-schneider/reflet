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
    "Install a feedback list with per-item vote state and composable metadata.",
  path: "/docs/components/feedback-cards/editorial-feed",
  title: "Editorial feed",
});
const IMPORT_CODE = `import {
  EditorialFeed, EditorialFeedComments, EditorialFeedContent,
  EditorialFeedItem, EditorialFeedMeta, EditorialFeedRule, EditorialFeedStatus,
  EditorialFeedTag, EditorialFeedTime, EditorialFeedTitle, EditorialFeedVote,
} from "@/components/ui/feedback-editorial-feed";`;
const FEATURES = [
  "Each EditorialFeedItem owns its vote state. Keep its vote control inside the item and give mapped items stable keys.",
  "onVoteChange receives local totals only, unlike the direction-based callbacks in the other styles.",
  "For navigation, place a link inside the h3 title. The feed renders divs; add surrounding list semantics if your page needs them.",
] as const;
const SUBCOMPONENTS: readonly Subcomponent[] = [
  {
    description:
      "Visual list wrapper. Accepts children and className; does not own vote state.",
    name: "EditorialFeed",
  },
  {
    description:
      "Positioned item and vote context. Accepts children and className.",
    name: "EditorialFeedItem",
    props: voteRootProps({
      description:
        "Local-mode totals after a vote. Unlike the other styles, this callback does not include voteType.",
      name: "onVoteChange",
      type: "(upvotes: number, downvotes: number) => void",
    }),
  },
  {
    description:
      "Margin vote control. Takes no props; must be inside EditorialFeedItem.",
    name: "EditorialFeedVote",
  },
  {
    description:
      "Decorative vertical divider. Accepts className, not children.",
    name: "EditorialFeedRule",
  },
  {
    description: "Content wrapper with children and className.",
    name: "EditorialFeedContent",
  },
  {
    description: "h3 heading with children and className.",
    name: "EditorialFeedTitle",
  },
  {
    description: "Metadata row with children and className.",
    name: "EditorialFeedMeta",
  },
  {
    description: "Status pill with children and className.",
    name: "EditorialFeedStatus",
    props: [
      {
        default: '"gray"',
        description: "Theme color key. gray/default are neutral.",
        name: "color",
        type: '"blue" | "brown" | "green" | "orange" | "pink" | "purple" | "red" | "yellow" | "gray" | "default"',
      },
    ],
  },
  {
    description:
      "Static italic tag with a # prefix. Accepts children and className; no color prop.",
    name: "EditorialFeedTag",
  },
  {
    description:
      "Text count and separator, not a comment action. Accepts className.",
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
    description:
      "Already formatted time passed as children. Accepts className.",
    name: "EditorialFeedTime",
  },
];

export default function EditorialFeedPage() {
  return (
    <RegistryDocPage
      description="Feedback rows with votes in the margin. Each row can manage local demo state or display state controlled by your app."
      features={FEATURES}
      importCode={IMPORT_CODE}
      preview={<EditorialFeedPreview />}
      registryName="feedback-editorial-feed"
      subcomponents={SUBCOMPONENTS}
      title="Editorial feed"
      usageCode={EDITORIAL_FEED_CODE}
    />
  );
}
