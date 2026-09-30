import type { PropDefinition } from "./props-table";

/**
 * Props shared by every feedback card root: uncontrolled defaults, the
 * controlled trio, and the controlled vote callback. `onVoteChange` differs
 * per card, so callers pass it in.
 */
function voteRootProps(onVoteChange: PropDefinition): PropDefinition[] {
  return [
    {
      default: "0",
      description: "Initial upvote count when the card manages its own state.",
      name: "defaultUpvotes",
      type: "number",
    },
    {
      default: "0",
      description:
        "Initial downvote count when the card manages its own state.",
      name: "defaultDownvotes",
      type: "number",
    },
    onVoteChange,
    {
      description:
        "Controlled upvote count. Passing it switches the card to controlled mode.",
      name: "upvotes",
      type: "number",
    },
    {
      default: "0",
      description: "Controlled downvote count.",
      name: "downvotes",
      type: "number",
    },
    {
      default: "null",
      description: "Controlled vote of the current user.",
      name: "voteType",
      type: '"upvote" | "downvote" | null',
    },
    {
      description:
        "Called with the pressed direction in controlled mode. Update upvotes, downvotes and voteType from here.",
      name: "onVote",
      type: '(direction: "upvote" | "downvote") => void',
    },
  ];
}

export { voteRootProps };
