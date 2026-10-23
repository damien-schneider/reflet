import type { Doc } from "../../_generated/dataModel";
import {
  contextLines,
  elementSummary,
  formatClock,
  onPage,
  singleLine,
  spokenLine,
  wrapUntrusted,
} from "../formatters";
import {
  type ContextPin,
  type LinkableEvidence,
  resolveSegmentContext,
  type SessionEventValue,
} from "../linking";
import type { SpokenRun } from "../speakers/attribution";

const MAX_PROMPT_SEGMENTS = 300;
const MAX_TRANSCRIPT_CHARS = 40_000;
const MAX_PROMPT_EVIDENCE = 40;
const MAX_HANDLED_PROPOSALS = 30;

type EvidenceTrigger = Doc<"sessionEvidence">["trigger"];

const EXPLICIT_TRIGGERS: Record<EvidenceTrigger, boolean> = {
  hover: false,
  manual: true,
  mark: true,
  navigation: false,
  select: true,
  start: false,
};

const TRIGGER_DESCRIPTIONS: Record<EvidenceTrigger, string> = {
  hover: "while the author rested the pointer on an element",
  manual: "added by the author",
  mark: "when the author marked the moment",
  navigation: "after a page change",
  select: "when the author pointed at an element",
  start: "at session start",
};

type PromptSegment<SegmentId extends string> = Pick<
  Doc<"sessionSegments">,
  "endMs" | "startMs" | "text"
> & {
  _id: SegmentId;
  contextCorrection?: { choice: ContextPin };
  speech: SpokenRun[] | null;
};

type PromptEvidence<EvidenceId extends string> = Pick<
  Doc<"sessionEvidence">,
  | "atMs"
  | "capturedAtMs"
  | "clientKey"
  | "element"
  | "frame"
  | "kind"
  | "link"
  | "note"
  | "status"
  | "trigger"
> & { _id: EvidenceId };

export type HandledProposal = Pick<
  Doc<"sessionProposals">,
  "decision" | "need" | "observed" | "setAside"
>;

export interface AnalysisSource<
  SegmentId extends string,
  EvidenceId extends string,
> {
  events: SessionEventValue[];
  evidence: PromptEvidence<EvidenceId>[];
  handledProposals: HandledProposal[];
  segments: PromptSegment<SegmentId>[];
  title: string;
}

export type RefinementTarget<
  SegmentId extends string,
  EvidenceId extends string,
> = Pick<
  Doc<"sessionProposals">,
  | "certainty"
  | "need"
  | "observed"
  | "question"
  | "response"
  | "setAside"
  | "unknowns"
> & {
  clarification: string;
  evidenceIds: EvidenceId[];
  segmentIds: SegmentId[];
};

export interface PreparedPrompt<
  SegmentId extends string,
  EvidenceId extends string,
> {
  evidenceIds: EvidenceId[];
  prompt: string;
  segmentIds: SegmentId[];
  speakersLabelled: boolean;
}

const selectSegments = <SegmentId extends string>(
  segments: PromptSegment<SegmentId>[]
) => {
  const spoken = segments
    .filter(({ text }) => text.trim() !== "")
    .sort((a, b) => a.startMs - b.startMs);
  const included: PromptSegment<SegmentId>[] = [];
  let transcriptChars = 0;
  for (const segment of spoken) {
    transcriptChars += segment.text.length;
    if (
      included.length === MAX_PROMPT_SEGMENTS ||
      transcriptChars > MAX_TRANSCRIPT_CHARS
    ) {
      break;
    }
    included.push(segment);
  }
  return { included, omittedCount: spoken.length - included.length };
};

const selectEvidence = <EvidenceId extends string>(
  evidence: PromptEvidence<EvidenceId>[]
): PromptEvidence<EvidenceId>[] => {
  const explicit = evidence.filter(({ trigger }) => EXPLICIT_TRIGGERS[trigger]);
  const automatic = evidence.filter(
    ({ trigger }) => !EXPLICIT_TRIGGERS[trigger]
  );
  return [...explicit, ...automatic]
    .slice(0, MAX_PROMPT_EVIDENCE)
    .sort((a, b) => a.atMs - b.atMs);
};

const transcriptBlock = <SegmentId extends string>(options: {
  segments: PromptSegment<SegmentId>[];
  omittedCount: number;
  events: SessionEventValue[];
  evidence: LinkableEvidence<string>[];
}): string => {
  const lines = options.segments.flatMap((segment, index) => {
    const resolved = resolveSegmentContext({
      events: options.events,
      evidence: options.evidence,
      segment: {
        contextCorrection: segment.contextCorrection?.choice,
        endMs: segment.endMs,
        startMs: segment.startMs,
      },
    });
    return [
      `S${index + 1} [${formatClock(segment.startMs)}–${formatClock(segment.endMs)}] ${spokenLine(segment)}`,
      ...contextLines(resolved, { withLocators: false }),
    ];
  });
  if (options.omittedCount > 0) {
    lines.push(`(${options.omittedCount} later passages are not shown.)`);
  }
  if (lines.length === 0) {
    lines.push("(Nothing was said in this session.)");
  }
  return wrapUntrusted("session_transcript", lines);
};

const evidenceLine = (item: PromptEvidence<string>, alias: string): string => {
  const head = `${alias} [${formatClock(item.atMs)}]`;
  if (item.kind === "link") {
    const label = item.link ? ` "${singleLine(item.link.label)}"` : "";
    return `${head} link${label} attached by the author`;
  }
  const parts = [
    `${head} screenshot ${TRIGGER_DESCRIPTIONS[item.trigger]}${onPage(item.frame?.url)}`,
  ];
  if (item.element) {
    parts.push(`element: ${elementSummary(item.element)}`);
  }
  if (item.note) {
    parts.push(`author's note: "${singleLine(item.note)}"`);
  }
  if (item.status === "missing") {
    parts.push("image not captured");
  }
  return parts.join(", ");
};

const handledLine = ({ decision, need, setAside }: HandledProposal): string => {
  const dropped =
    setAside.length > 0
      ? ` — set aside: ${setAside.map(singleLine).join("; ")}`
      : "";
  return `- ${singleLine(need)} (${decision})${dropped}`;
};

const dataBlock = (
  title: string,
  evidence: PromptEvidence<string>[],
  handled: HandledProposal[]
): string => {
  const lines = [
    `Session title: ${singleLine(title)}`,
    "Evidence:",
    ...evidence.map((item, index) => evidenceLine(item, `E${index + 1}`)),
  ];
  if (evidence.length === 0) {
    lines.push("(none)");
  }
  if (handled.length > 0) {
    lines.push(
      "Already handled by the author (do not propose these needs again):",
      ...handled.slice(0, MAX_HANDLED_PROPOSALS).map(handledLine)
    );
  }
  return wrapUntrusted("session_data", lines);
};

export const prepareMaterial = <
  SegmentId extends string,
  EvidenceId extends string,
>(
  source: AnalysisSource<SegmentId, EvidenceId>
): PreparedPrompt<SegmentId, EvidenceId> => {
  const { included, omittedCount } = selectSegments(source.segments);
  const evidence = selectEvidence(source.evidence);
  const transcript = transcriptBlock({
    events: source.events,
    evidence: source.evidence.map((item) => {
      const position = evidence.indexOf(item);
      return {
        atMs: item.atMs,
        capturedAtMs: item.capturedAtMs,
        clientKey: item.clientKey,
        element: item.element,
        frame: item.frame,
        id: position === -1 ? null : `E${position + 1}`,
        storedId: item._id,
        trigger: item.trigger,
      };
    }),
    omittedCount,
    segments: included,
  });
  return {
    evidenceIds: evidence.map(({ _id }) => _id),
    prompt: `${transcript}\n\n${dataBlock(source.title, evidence, source.handledProposals)}`,
    segmentIds: included.map(({ _id }) => _id),
    speakersLabelled: included.some(({ speech }) =>
      speech?.some(({ speaker }) => speaker !== null)
    ),
  };
};

export const prepareAnalysisPrompt = <
  SegmentId extends string,
  EvidenceId extends string,
>(
  source: AnalysisSource<SegmentId, EvidenceId>
): PreparedPrompt<SegmentId, EvidenceId> => {
  const material = prepareMaterial(source);
  return {
    ...material,
    prompt: `${material.prompt}\n\nWrite the proposals for this session.`,
  };
};

const aliasesOf = <Id extends string>(
  ids: Id[],
  shown: Id[],
  prefix: "S" | "E"
): string => {
  const aliases = ids.flatMap((id) => {
    const position = shown.indexOf(id);
    return position === -1 ? [] : [`${prefix}${position + 1}`];
  });
  return aliases.length > 0 ? aliases.join(", ") : "none";
};

export const prepareRefinementPrompt = <
  SegmentId extends string,
  EvidenceId extends string,
>(
  source: AnalysisSource<SegmentId, EvidenceId>,
  target: RefinementTarget<SegmentId, EvidenceId>
): PreparedPrompt<SegmentId, EvidenceId> => {
  const material = prepareMaterial(source);
  const listed = (items: string[]) =>
    items.length > 0 ? items.map(singleLine).join("; ") : "none";
  const proposal = wrapUntrusted("session_data", [
    `Need: ${singleLine(target.need)}`,
    `Observed: ${singleLine(target.observed)}`,
    `Considered response: ${singleLine(target.response ?? "none")}`,
    `Set aside: ${listed(target.setAside)}`,
    `Unknowns: ${listed(target.unknowns)}`,
    `Certainty: ${target.certainty}`,
    `Question asked: ${singleLine(target.question ?? "none")}`,
    `Sources: ${aliasesOf(target.segmentIds, material.segmentIds, "S")}`,
    `Evidence: ${aliasesOf(target.evidenceIds, material.evidenceIds, "E")}`,
  ]);
  const clarification = wrapUntrusted("session_data", [
    singleLine(target.clarification),
  ]);
  return {
    ...material,
    prompt: [
      material.prompt,
      `The proposal to update:\n${proposal}`,
      `The author's precision about this proposal:\n${clarification}`,
      "Rewrite this one proposal so it reflects the author's precision.",
    ].join("\n\n"),
  };
};
