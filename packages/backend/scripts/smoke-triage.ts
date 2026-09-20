import {
  evaluateFeedbackTriage,
  type TriageTag,
} from "../convex/feedback/triage_evaluation";

const tags = [
  {
    _id: "t_billing",
    description: "Charges, invoices, refunds",
    name: "Billing",
  },
  { _id: "t_bug", name: "Bug" },
  { _id: "t_mobile", name: "Mobile" },
  { _id: "t_docs", name: "Docs" },
] as TriageTag[];

const cases = [
  {
    description:
      "On desktop Chrome the sidebar renders on top of the main panel at 1280px width.",
    expectWithhold: false,
    needsReviewBelow: 0.6,
    title: "Sidebar overlaps content",
  },
  {
    description: "Hi team, check out our SEO services at bestseo.example.com.",
    expectWithhold: true,
    title: "Great product!",
  },
  {
    description: "Honestly the best tool we use. Keep it up!",
    expectWithhold: false,
    needsReviewBelow: 0.75,
    title: "Love it",
  },
  {
    description:
      "Every invoice PDF we download is missing the VAT line, so accounting rejects them.",
    expectWithhold: false,
    needsReviewBelow: 0.6,
    title: "Invoices unusable",
  },
  {
    description: "it broke again yesterday, please fix asap",
    expectWithhold: false,
    needsReviewAbove: 0.85,
    title: "Doesn't work",
  },
  {
    description:
      "Also please add dark mode, and billing is charging us twice, and the docs search is broken.",
    expectWithhold: false,
    needsReviewAbove: 0.85,
    title: "A few things",
  },
];

let failed = false;

for (const {
  expectWithhold,
  needsReviewAbove,
  needsReviewBelow,
  ...feedback
} of cases) {
  const startedAt = Date.now();
  const result = await evaluateFeedbackTriage({ ...feedback, tags });

  const ok =
    result.withhold === expectWithhold &&
    (needsReviewBelow === undefined || result.needsReview < needsReviewBelow) &&
    (needsReviewAbove === undefined || result.needsReview > needsReviewAbove);
  failed ||= !ok;

  process.stdout.write(
    `${ok ? "ok  " : "FAIL"} ${Date.now() - startedAt}ms  ${feedback.title} -> ${JSON.stringify(result)}\n`
  );
}

if (failed) {
  process.exit(1);
}
