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
    "Install a feedback card with controlled or local votes, a corner badge and footer totals.",
  path: "/docs/components/feedback-cards/sweep-corner",
  title: "Sweep corner",
});
const IMPORT_CODE = `import {
  SweepCorner, SweepCornerBadge, SweepCornerCard, SweepCornerContent,
  SweepCornerFooter, SweepCornerTag, SweepCornerTags, SweepCornerTitle,
} from "@/components/ui/feedback-sweep-corner";`;
const FEATURES = [
  "The badge shows net votes. The footer shows separate totals and upvote share, with 50% when there are no votes.",
  "Title onClick creates a card-wide button overlay. Keep additional controls clear of the overlay, and never wrap vote buttons in another button.",
] as const;
const SUBCOMPONENTS: readonly Subcomponent[] = [
  {
    description:
      "Required vote context and positioned wrapper. Accepts children and className.",
    name: "SweepCorner",
    props: voteRootProps({
      description:
        "Local-mode callback after the vote changes. Not called in controlled mode.",
      name: "onVoteChange",
      type: '(voteType: "upvote" | "downvote" | null) => void',
    }),
  },
  {
    description: "Card surface. Accepts children and className.",
    name: "SweepCornerCard",
  },
  {
    description:
      "Content region with room reserved for the corner badge. Accepts children and className.",
    name: "SweepCornerContent",
  },
  {
    description:
      "h3 heading. Accepts children and className; adjust the installed heading if your page hierarchy needs another level.",
    name: "SweepCornerTitle",
    props: [
      {
        description:
          "Optional button action covering the card. Without it the title is static.",
        name: "onClick",
        type: "() => void",
      },
    ],
  },
  {
    description: "Wrapping tag row. Accepts children and className.",
    name: "SweepCornerTags",
  },
  {
    description: "Tag pill. Accepts children and className.",
    name: "SweepCornerTag",
    props: [
      {
        description:
          "blue, brown, green, orange, pink, purple, red or yellow. gray, default and unknown strings use neutral styling.",
        name: "color",
        required: true,
        type: "string",
      },
    ],
  },
  {
    description:
      "Context-bound vote buttons and net count. Takes no props; must be inside SweepCorner.",
    name: "SweepCornerBadge",
  },
  {
    description: "Context-bound totals, comments and time. Accepts className.",
    name: "SweepCornerFooter",
    props: [
      {
        description: "Display count; no comment action is attached.",
        name: "comments",
        required: true,
        type: "number",
      },
      {
        description: "Already formatted display text.",
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
      description="A composable feedback card with a corner vote badge. Votes stay in React state until your app persists them."
      features={FEATURES}
      importCode={IMPORT_CODE}
      preview={<SweepCornerPreview />}
      registryName="feedback-sweep-corner"
      subcomponents={SUBCOMPONENTS}
      title="Sweep corner"
      usageCode={SWEEP_CORNER_CODE}
    />
  );
}
