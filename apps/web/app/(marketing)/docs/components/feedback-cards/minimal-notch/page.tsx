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
  description: "A minimal feedback card with a side notch vote indicator.",
  path: "/docs/components/feedback-cards/minimal-notch",
  title: "Minimal notch – feedback card",
});

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

const COLOR_TYPE =
  '"blue" | "brown" | "green" | "orange" | "pink" | "purple" | "red" | "yellow" | "gray" | "default"';

const FEATURES = [
  "Side vote column with up and down buttons, each showing its own count.",
  "A notch bar lights up in the primary color on upvote and the destructive color on downvote.",
  "Status and tag pills share one color scale built on the --tag-* tokens.",
  "Works uncontrolled out of the box, or controlled from your own vote state.",
] as const;

const SUBCOMPONENTS: readonly Subcomponent[] = [
  {
    description:
      "Root. Holds vote state and shares it with the vote column through React context.",
    name: "MinimalNotch",
    props: voteRootProps({
      description:
        "Called with the new vote and totals after an uncontrolled vote.",
      name: "onVoteChange",
      type: "(voteType, upvotes: number, downvotes: number) => void",
    }),
  },
  {
    description: "Card body with border, hover shadow and inner spacing.",
    name: "MinimalNotchCard",
  },
  { description: "Title, rendered as an h3.", name: "MinimalNotchTitle" },
  {
    description: "A colored status pill.",
    name: "MinimalNotchStatus",
    props: [
      {
        default: '"blue"',
        description: "Pill color.",
        name: "color",
        type: COLOR_TYPE,
      },
    ],
  },
  { description: "Wrapping row for tags.", name: "MinimalNotchTags" },
  {
    description: "A colored tag pill.",
    name: "MinimalNotchTag",
    props: [
      {
        default: '"gray"',
        description: "Pill color.",
        name: "color",
        type: COLOR_TYPE,
      },
    ],
  },
  {
    description: "Row with comment count and relative time.",
    name: "MinimalNotchMeta",
    props: [
      {
        description: "Number of comments.",
        name: "comments",
        required: true,
        type: "number",
      },
      {
        description: 'Relative time, e.g. "3 days ago".',
        name: "time",
        required: true,
        type: "string",
      },
    ],
  },
  {
    description:
      "Vote column with the notch bar and up and down buttons. Reads vote state from context.",
    name: "MinimalNotchVote",
  },
];

export default function MinimalNotchPage() {
  return (
    <RegistryDocPage
      description="A quiet feedback card with a side vote column. A notch bar next to the score lights up to show the current vote."
      features={FEATURES}
      importCode={IMPORT_CODE}
      preview={<MinimalNotchPreview />}
      registryName="feedback-minimal-notch"
      subcomponents={SUBCOMPONENTS}
      title="Minimal Notch"
      usageCode={MINIMAL_NOTCH_CODE}
    />
  );
}
