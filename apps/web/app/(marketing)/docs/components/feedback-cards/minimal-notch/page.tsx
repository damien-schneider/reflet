import type { Metadata } from "next";
import { MINIMAL_NOTCH_CODE } from "@/components/docs/feedback-card-codes";
import { MinimalNotchPreview } from "@/components/docs/feedback-card-previews";
import {
  RegistryDocPage,
  type Subcomponent,
} from "@/components/docs/registry-doc-page";
import { voteRootProps } from "@/components/docs/vote-root-props";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Install a feedback card with a side vote column, status and tags.",
  path: "/docs/components/feedback-cards/minimal-notch",
  title: "Minimal notch",
});
const IMPORT_CODE = `import {
  MinimalNotch, MinimalNotchCard, MinimalNotchMeta, MinimalNotchStatus,
  MinimalNotchTag, MinimalNotchTags, MinimalNotchTitle, MinimalNotchVote,
} from "@/components/ui/feedback-minimal-notch";`;
const COLOR_TYPE =
  '"blue" | "brown" | "green" | "orange" | "pink" | "purple" | "red" | "yellow" | "gray" | "default"';
const FEATURES = [
  "Render the card and vote column as siblings inside MinimalNotch.",
  "The notch uses primary for upvotes and destructive for downvotes.",
  "For navigation, place a link inside the h3 title rather than wrapping the card and its vote buttons in another button.",
] as const;
const SUBCOMPONENTS: readonly Subcomponent[] = [
  {
    description:
      "Vote context and flex wrapper. Accepts children and className.",
    name: "MinimalNotch",
    props: voteRootProps({
      description: "New local vote and totals. Not called in controlled mode.",
      name: "onVoteChange",
      type: '(voteType: "upvote" | "downvote" | null, upvotes: number, downvotes: number) => void',
    }),
  },
  {
    description:
      "Card surface and content spacing. Accepts children and className.",
    name: "MinimalNotchCard",
  },
  {
    description:
      "h3 heading with children and className. Change the installed heading level if your page hierarchy requires it.",
    name: "MinimalNotchTitle",
  },
  {
    description: "Status pill with children and className.",
    name: "MinimalNotchStatus",
    props: [
      {
        default: '"blue"',
        description: "Theme color key, not a CSS color.",
        name: "color",
        type: COLOR_TYPE,
      },
    ],
  },
  {
    description: "Wrapping tag row with children and className.",
    name: "MinimalNotchTags",
  },
  {
    description: "Tag pill with children and className.",
    name: "MinimalNotchTag",
    props: [
      {
        default: '"gray"',
        description: "Theme color key. gray and default are neutral.",
        name: "color",
        type: COLOR_TYPE,
      },
    ],
  },
  {
    description: "Static comment count and time. Accepts className.",
    name: "MinimalNotchMeta",
    props: [
      {
        description: "Display count, not a comment button.",
        name: "comments",
        required: true,
        type: "number",
      },
      {
        description: "Already formatted text.",
        name: "time",
        required: true,
        type: "string",
      },
    ],
  },
  {
    description:
      "Vote column and notch indicator. Takes no props; reads the root context.",
    name: "MinimalNotchVote",
  },
];

export default function MinimalNotchPage() {
  return (
    <RegistryDocPage
      description="A feedback card with a separate vote column. Supply your own persistence and use the status and tag parts only where needed."
      features={FEATURES}
      importCode={IMPORT_CODE}
      preview={<MinimalNotchPreview />}
      registryName="feedback-minimal-notch"
      subcomponents={SUBCOMPONENTS}
      title="Minimal notch"
      usageCode={MINIMAL_NOTCH_CODE}
    />
  );
}
