import type { SessionDetail } from "../../protocol";
import { countLabel, isAnalysisOutdated } from "../session-format";

export interface StepProgress {
  done: number;
  total: number;
  valueText: string;
}

export interface ProcessingStep {
  analyzeLabel: string | null;
  key: "upload" | "transcription" | "intentions";
  label: string;
  progress?: StepProgress;
  state: "done" | "active" | "waiting" | "failed";
}

function uploadStep(pendingUploads: number): ProcessingStep {
  return pendingUploads > 0
    ? { analyzeLabel: null, key: "upload", label: "Uploading", state: "active" }
    : { analyzeLabel: null, key: "upload", label: "Uploaded", state: "done" };
}

function transcriptionStep(
  detail: SessionDetail,
  isAnalysisQueued: boolean
): ProcessingStep | null {
  const voice = detail.segments.filter((segment) => segment.source === "voice");
  const transcribing = voice.filter(
    ({ transcription }) =>
      transcription.state === "pending" || transcription.state === "running"
  ).length;
  const step = { analyzeLabel: null, key: "transcription" } as const;
  if (transcribing > 0) {
    const transcribed = voice.length - transcribing;
    return {
      ...step,
      label: "Transcribing your voice",
      progress: {
        done: transcribed,
        total: voice.length,
        valueText: `${transcribed} of ${countLabel(voice.length, "passage")}`,
      },
      state: "active",
    };
  }
  if (voice.length > 0) {
    return { ...step, label: "Voice transcribed", state: "done" };
  }
  return isAnalysisQueued
    ? { ...step, label: "Transcribe your voice", state: "waiting" }
    : null;
}

function comparedRevision(detail: SessionDetail): number | null {
  const { continuation } = detail;
  const isComparing =
    continuation?.intention && continuation.contribution.detachedAt === null;
  return isComparing ? continuation.contribution.baseRevision : null;
}

function intentionStep(
  detail: SessionDetail,
  isAnalysisQueued: boolean
): ProcessingStep | null {
  const { session } = detail;
  const { analysis } = session;
  const revision = comparedRevision(detail);
  const isComparing = revision !== null;
  const step = { analyzeLabel: null, key: "intentions" } as const;
  if (analysis.state === "running") {
    const label = isComparing
      ? `Comparing with revision ${revision}…`
      : "Finding intentions with AI…";
    return { ...step, label, state: "active" };
  }
  if (analysis.state === "waiting" || isAnalysisQueued) {
    const label = isComparing
      ? `Compare with revision ${revision}`
      : "Find intentions with AI";
    return { ...step, label, state: "waiting" };
  }
  if (analysis.state === "failed") {
    const failure = isComparing ? "The comparison failed" : "Analysis failed";
    const reason = analysis.error ?? "Unknown error.";
    return {
      ...step,
      analyzeLabel: "Try again",
      label: `${failure}: ${reason}`,
      state: "failed",
    };
  }
  if (isAnalysisOutdated(session)) {
    return {
      ...step,
      analyzeLabel: "Analyze again",
      label: "The transcript changed since the analysis.",
      state: "waiting",
    };
  }
  if (analysis.state === "idle") {
    return detail.segments.length > 0
      ? {
          ...step,
          analyzeLabel: "Analyze",
          label: "Not analyzed yet.",
          state: "waiting",
        }
      : null;
  }
  const label = isComparing
    ? `Compared with revision ${revision}`
    : `Found ${countLabel(analysis.proposalCount ?? 0, "intention")}`;
  return { ...step, label, state: "done" };
}

function liveIntentionSteps(detail: SessionDetail): ProcessingStep[] {
  const step = intentionStep(detail, false);
  return step?.state === "active" || step?.state === "failed" ? [step] : [];
}

export function processingSteps(
  detail: SessionDetail,
  pendingUploads: number
): ProcessingStep[] {
  if (detail.session.collection !== "ended") {
    return liveIntentionSteps(detail);
  }
  const isAnalysisQueued =
    pendingUploads > 0 && detail.session.analysis.state === "idle";
  const steps = [
    detail.session.isMine ? uploadStep(pendingUploads) : null,
    transcriptionStep(detail, isAnalysisQueued),
    intentionStep(detail, isAnalysisQueued),
  ];
  return steps.filter((step) => step !== null);
}
