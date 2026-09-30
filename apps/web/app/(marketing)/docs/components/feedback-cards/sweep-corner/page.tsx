import type { Metadata } from "next";

import { SWEEP_CORNER_CODE } from "@/components/docs/feedback-card-codes";
import { SweepCornerPreview } from "@/components/docs/feedback-card-previews";
import {
  RegistryDocPage,
  type Subcomponent,
} from "@/components/docs/registry-doc-page";
import { voteRootProps } from "@/components/docs/vote-root-props";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "A feedback card with a corner vote badge and sweep animation effect.",
  path: "/docs/components/feedback-cards/sweep-corner",
  title: "Sweep corner – feedback card",
});

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

const FEATURES = [
  "Corner badge with up and down vote buttons and a net count that rolls on change.",
  "A gradient sweeps across the footer each time the vote changes.",
  "Works uncontrolled out of the box, or controlled from your own vote state.",
  "Tag pills read the --tag-* color tokens installed with the component.",
] as const;

const SUBCOMPONENTS: readonly Subcomponent[] = [
  {
    description:
      "Root. Holds vote state and shares it with the badge and footer through React context.",
    name: "SweepCorner",
    props: voteRootProps({
      description: "Called with the new vote after an uncontrolled vote.",
      name: "onVoteChange",
      type: '(voteType: "upvote" | "downvote" | null) => void',
    }),
  },
  {
    description: "Card surface with border and hover shadow.",
    name: "SweepCornerCard",
  },
  {
    description: "Padded content area that leaves room for the corner badge.",
    name: "SweepCornerContent",
  },
  { description: "Title, rendered as an h3.", name: "SweepCornerTitle" },
  {
    description: "Wrapping row for tag pills.",
    name: "SweepCornerTags",
  },
  {
    description: "A colored tag pill.",
    name: "SweepCornerTag",
    props: [
      {
        description:
          "Color key: blue, brown, green, orange, pink, purple, red, yellow, gray or default.",
        name: "color",
        required: true,
        type: "string",
      },
    ],
  },
  {
    description:
      "Corner vote badge with up and down buttons and the net count. Reads vote state from context.",
    name: "SweepCornerBadge",
  },
  {
    description:
      "Footer with comment count, time, vote totals and upvote share. Plays the sweep when the user votes.",
    name: "SweepCornerFooter",
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
];

export default function SweepCornerPage() {
  return (
    <RegistryDocPage
      description="A feedback card with a corner vote badge. A gradient sweeps across the card whenever the vote changes."
      features={FEATURES}
      importCode={IMPORT_CODE}
      preview={<SweepCornerPreview />}
      registryName="feedback-sweep-corner"
      subcomponents={SUBCOMPONENTS}
      title="Sweep Corner"
      usageCode={SWEEP_CORNER_CODE}
    />
  );
}
