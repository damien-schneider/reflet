import type { Doc } from "../../../_generated/dataModel";
import { formatClock, singleLine, wrapUntrusted } from "../../formatters";
import {
  type AnalysisSource,
  type PreparedPrompt,
  prepareMaterial,
} from "../analysis_prompt";

const MAX_EARLIER_QUOTES = 12;

export interface ContinuedIntentionSource {
  answers: { text: string }[];
  earlierQuotes: Pick<Doc<"sessionSegments">, "startMs" | "text">[];
  earlierTitle: string;
  intention: Pick<
    Doc<"sessionProposals">,
    | "need"
    | "observed"
    | "question"
    | "response"
    | "revision"
    | "setAside"
    | "unknowns"
  >;
  question: string | null;
}

const listed = (items: string[]): string =>
  items.length > 0 ? items.map(singleLine).join("; ") : "none";

const intentionBlock = (target: ContinuedIntentionSource): string => {
  const { intention } = target;
  const quotes = target.earlierQuotes
    .filter(({ text }) => text.trim() !== "")
    .slice(0, MAX_EARLIER_QUOTES)
    .map(
      ({ startMs, text }) => `  [${formatClock(startMs)}] ${singleLine(text)}`
    );
  return wrapUntrusted("session_data", [
    `Earlier session: ${singleLine(target.earlierTitle)}`,
    `Revision: ${intention.revision}`,
    `Need: ${singleLine(intention.need)}`,
    `Observed: ${singleLine(intention.observed)}`,
    `Considered response: ${singleLine(intention.response ?? "none")}`,
    `Unknowns: ${listed(intention.unknowns)}`,
    `Set aside: ${listed(intention.setAside)}`,
    "What the author said in the earlier session:",
    ...(quotes.length > 0 ? quotes : ["  (no passage)"]),
  ]);
};

const answersBlock = (target: ContinuedIntentionSource): string[] => {
  if (!target.question || target.answers.length === 0) {
    return [];
  }
  return [
    `Your earlier question and the author's answers:\n${wrapUntrusted(
      "session_data",
      [
        `Question: ${singleLine(target.question)}`,
        ...target.answers.map(({ text }) => `Answer: ${singleLine(text)}`),
      ]
    )}`,
  ];
};

export const prepareContinuationPrompt = <
  SegmentId extends string,
  EvidenceId extends string,
>(
  source: AnalysisSource<SegmentId, EvidenceId>,
  target: ContinuedIntentionSource
): PreparedPrompt<SegmentId, EvidenceId> => {
  const material = prepareMaterial(source);
  return {
    ...material,
    prompt: [
      material.prompt,
      `The intention this session continues:\n${intentionBlock(target)}`,
      ...answersBlock(target),
      "Propose the changes to this intention, then any other needs in this session.",
    ].join("\n\n"),
  };
};
