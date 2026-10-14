import type { SessionDetail, SessionSummary } from "../protocol";

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;

export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / SECOND_MS));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function countLabel(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function spokenDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / SECOND_MS));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = countLabel(totalSeconds % 60, "second");
  return minutes > 0 ? `${countLabel(minutes, "minute")} ${seconds}` : seconds;
}

export function shortDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / SECOND_MS));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds} s`;
  }
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`;
}

export function preciseSeconds(ms: number): string {
  return `${(Math.abs(ms) / SECOND_MS).toFixed(1)} s`;
}

export function minutesLeft(remainingMs: number): number {
  return Math.max(1, Math.ceil(remainingMs / MINUTE_MS));
}

function startOfDay(epochMs: number, daysBack: number): number {
  const day = new Date(epochMs);
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() - daysBack);
  return day.getTime();
}

function dayLabel(epochMs: number, now: number): string {
  if (epochMs >= startOfDay(now, 0)) {
    return "Today";
  }
  if (epochMs >= startOfDay(now, 1)) {
    return "Yesterday";
  }
  const date = new Date(epochMs);
  const isThisYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString(
    undefined,
    isThisYear ? { day: "numeric", month: "short" } : { dateStyle: "medium" }
  );
}

export function formatDate(epochMs: number, now = Date.now()): string {
  const time = new Date(epochMs).toLocaleTimeString(undefined, {
    timeStyle: "short",
  });
  return `${dayLabel(epochMs, now)}, ${time}`;
}

export function isAnalysisBusy(summary: SessionSummary): boolean {
  return (
    summary.analysis.state === "waiting" || summary.analysis.state === "running"
  );
}

export function isAnalysisOutdated(summary: SessionSummary): boolean {
  const { analyzedRevision, transcriptRevision } = summary.analysis;
  return analyzedRevision !== null && analyzedRevision < transcriptRevision;
}

export function sessionStatusLine(summary: SessionSummary): string {
  const { analysis, collection, counts } = summary;
  if (collection !== "ended") {
    return "Recording";
  }
  if (counts.pendingSegments > 0) {
    return "Transcribing";
  }
  if (isAnalysisBusy(summary)) {
    return "Reading";
  }
  if (analysis.state === "failed") {
    return "Analysis failed";
  }
  if (analysis.state === "idle") {
    return "Not analyzed yet";
  }
  return `${countLabel(counts.proposals, "intention")} · ${counts.kept} confirmed`;
}

export function isDetailProcessing(detail: SessionDetail): boolean {
  const transcribing = detail.segments.some(
    (segment) =>
      segment.transcription.state === "pending" ||
      segment.transcription.state === "running"
  );
  const refining = detail.proposals.some(
    (proposal) => proposal.refinement?.state === "running"
  );
  const comparing = detail.continuation?.contribution.state === "analyzing";
  return (
    transcribing ||
    refining ||
    comparing ||
    isAnalysisBusy(detail.session) ||
    detail.session.collection !== "ended"
  );
}
