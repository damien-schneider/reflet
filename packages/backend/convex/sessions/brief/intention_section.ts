import type { Doc, Id } from "../../_generated/dataModel";
import { quotedPassage, singleLine, wrapUntrusted } from "../formatters";
import {
  type LinkableEvidence,
  resolveStoredSegment,
  type SessionEventValue,
} from "../linking";
import { type SpeakerTurn, segmentSpeech } from "../speakers/attribution";
import { describeEvidence, type NamedEvidence } from "./evidence_names";

export interface BriefSource {
  events: SessionEventValue[];
  evidence: Doc<"sessionEvidence">[];
  linkable: LinkableEvidence<string>[];
  segments: Doc<"sessionSegments">[];
  session: Doc<"sessions">;
  turns: SpeakerTurn[];
}

type IntentionField =
  Doc<"sessionContributions">["applied"][number]["fields"][number];

const FIELD_LABELS: Record<IntentionField["field"], string> = {
  need: "Need",
  observed: "Observed",
  response: "Considered response",
  setAside: "Set aside",
  unknowns: "Unknowns",
};

export const formatRecordedAt = (ms: number): string =>
  `${new Date(ms).toISOString().slice(0, 16).replace("T", " ")} UTC`;

const bulletList = (title: string, items: string[]): string[] =>
  items.length === 0
    ? []
    : [`${title}:`, ...items.map((item) => `- ${singleLine(item)}`), ""];

const quotesFrom = (
  source: BriefSource,
  segmentIds: Id<"sessionSegments">[]
): string[] =>
  source.segments
    .filter(
      (segment) =>
        segmentIds.includes(segment._id) && segment.text.trim() !== ""
    )
    .sort((a, b) => a.startMs - b.startMs)
    .flatMap((segment) =>
      quotedPassage(
        {
          speech: segmentSpeech(segment, source.turns),
          startMs: segment.startMs,
          text: segment.text,
        },
        resolveStoredSegment(segment, {
          events: source.events,
          evidence: source.linkable,
        })
      )
    );

const homeQuotes = (
  proposal: Doc<"sessionProposals">,
  home: BriefSource
): string[] => {
  const quotes = [
    ...quotesFrom(home, proposal.segmentIds),
    ...proposal.clarifications.map(
      ({ text }) => `[clarification] ${singleLine(text)}`
    ),
  ];
  if (quotes.length === 0) {
    return [
      "Sources: no transcript passage is attached to this intention.",
      "",
    ];
  }
  return ["Sources:", wrapUntrusted("session_transcript", quotes), ""];
};

const quoted = (value: string | string[]): string =>
  typeof value === "string"
    ? `"${singleLine(value)}"`
    : value.map((item) => `"${singleLine(item)}"`).join(", ") || "nothing";

const appliedLines = (field: IntentionField): string[] => {
  const label = FIELD_LABELS[field.field];
  if (typeof field.before === "string" || typeof field.after === "string") {
    return [`- ${label}: ${quoted(field.before)} → ${quoted(field.after)}`];
  }
  const { after, before } = field;
  const added = after.filter((item) => !before.includes(item));
  const removed = before.filter((item) => !after.includes(item));
  return [
    ...added.map((item) => `- ${label}: added "${singleLine(item)}"`),
    ...removed.map((item) => `- ${label}: removed "${singleLine(item)}"`),
  ];
};

const contributionBlock = (
  contribution: Doc<"sessionContributions">,
  source: BriefSource
): string[] => {
  const [latest] = contribution.applied.slice(-1);
  if (!latest) {
    return [];
  }
  const quotes = quotesFrom(source, contribution.segmentIds);
  return [
    `Continued in session "${singleLine(source.session.title)}" (recorded ${formatRecordedAt(source.session.startedAt)}), accepted into revision ${latest.revision}:`,
    ...contribution.applied.flatMap(({ fields }) =>
      fields.flatMap(appliedLines)
    ),
    ...(quotes.length > 0 ? [wrapUntrusted("session_transcript", quotes)] : []),
    "",
  ];
};

type HandoffEntry = Doc<"sessionHandoffs">["proposals"][number];

const changesSinceLastBrief = (
  proposal: Doc<"sessionProposals">,
  last: { at: number; entry: HandoffEntry } | null
): string[] => {
  if (!last || last.entry.revision >= proposal.revision) {
    return [];
  }
  const { entry } = last;
  const changed = [
    ...(entry.need === proposal.need
      ? []
      : [`- Need was: "${singleLine(entry.need)}"`]),
    ...(entry.response === undefined ||
    (entry.response ?? "") === (proposal.response ?? "")
      ? []
      : [
          `- Considered response was: ${entry.response ? `"${singleLine(entry.response)}"` : "none"}`,
        ]),
    ...(entry.unknowns === undefined ||
    entry.unknowns.join("\n") === proposal.unknowns.join("\n")
      ? []
      : [`- Unknowns were: ${quoted(entry.unknowns)}`]),
  ];
  return [
    `Changed since the brief of ${formatRecordedAt(last.at)} (revision ${entry.revision} → ${proposal.revision}):`,
    ...(changed.length > 0 ? changed : ["- Sources and evidence only"]),
    "",
  ];
};

export const lastHandoffOf = (
  proposalId: Id<"sessionProposals">,
  handoffs: Doc<"sessionHandoffs">[]
): { at: number; entry: HandoffEntry } | null => {
  let latest: { at: number; entry: HandoffEntry } | null = null;
  for (const handoff of handoffs) {
    const entry = handoff.proposals.find(
      (item) => item.proposalId === proposalId
    );
    if (entry && (latest === null || handoff.createdAt > latest.at)) {
      latest = { at: handoff.createdAt, entry };
    }
  }
  return latest;
};

export interface IntentionSectionInput {
  contributions: Doc<"sessionContributions">[];
  home: BriefSource;
  index: number;
  named: NamedEvidence[];
  previousHandoffs: Doc<"sessionHandoffs">[];
  proposal: Doc<"sessionProposals">;
  sourcesBySession: Map<Id<"sessions">, BriefSource>;
}

export const intentionSection = (input: IntentionSectionInput): string[] => {
  const { index, proposal } = input;
  const contributions = input.contributions.filter(
    (contribution) => contribution.intentionId === proposal._id
  );
  const citedIds = [
    ...proposal.evidenceIds,
    ...contributions.flatMap(({ evidenceIds }) => evidenceIds),
  ];
  const cited = input.named.filter(({ doc }) => citedIds.includes(doc._id));
  const certainty =
    proposal.certainty === "uncertain"
      ? " · the author's intent is uncertain"
      : "";
  return [
    `## Intention ${index + 1}: ${singleLine(proposal.need)}`,
    "",
    `Intention ${proposal._id} (revision ${proposal.revision})${certainty}`,
    "",
    ...changesSinceLastBrief(
      proposal,
      lastHandoffOf(proposal._id, input.previousHandoffs)
    ),
    `Need: ${singleLine(proposal.need)}`,
    "",
    `Observed — said or shown by the author, not verified: ${singleLine(proposal.observed)}`,
    "",
    ...(proposal.response
      ? [`Considered response: ${singleLine(proposal.response)}`, ""]
      : []),
    ...bulletList("Set aside — do not build", proposal.setAside),
    ...bulletList("Unknowns — confirm, don't guess", [
      ...proposal.unknowns,
      ...(proposal.question ? [proposal.question] : []),
    ]),
    ...homeQuotes(proposal, input.home),
    ...contributions.flatMap((contribution) => {
      const source = input.sourcesBySession.get(contribution.sessionId);
      return source ? contributionBlock(contribution, source) : [];
    }),
    ...bulletList("Evidence", cited.map(describeEvidence)),
  ];
};
