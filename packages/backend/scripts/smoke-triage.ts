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
    expectReview: false,
    title: "Sidebar overlaps content",
  },
  {
    description: "Hi team, check out our SEO services at bestseo.example.com.",
    expectReview: true,
    title: "Great product!",
  },
  {
    description: "Honestly the best tool we use. Keep it up!",
    expectReview: false,
    title: "Love it",
  },
  {
    description:
      "Every invoice PDF we download is missing the VAT line, so accounting rejects them.",
    expectReview: false,
    title: "Invoices unusable",
  },
];

let failed = false;

for (const { expectReview, ...feedback } of cases) {
  const startedAt = Date.now();
  const result = await evaluateFeedbackTriage({ ...feedback, tags });
  const ok = result.needsReview === expectReview;
  failed ||= !ok;

  process.stdout.write(
    `${ok ? "ok  " : "FAIL"} ${Date.now() - startedAt}ms  ${feedback.title} -> ${JSON.stringify(result)}\n`
  );
}

if (failed) {
  process.exit(1);
}
