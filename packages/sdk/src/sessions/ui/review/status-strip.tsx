import { useSyncStatus } from "../../local/local-sessions";
import type { SessionDetail } from "../../protocol";
import { isAnalysisBusy, isAnalysisOutdated } from "../session-format";
import { useSessionAction, useSessionWorkspace } from "../session-workspace";
import type { ReviewHandle } from "./use-session-detail";

function transcribingLine(detail: SessionDetail): string | null {
  const voice = detail.segments.filter((segment) => segment.source === "voice");
  const busy = voice.filter(
    (segment) =>
      segment.transcription.state === "pending" ||
      segment.transcription.state === "running"
  );
  if (busy.length === 0) {
    return null;
  }
  return `Transcribing ${voice.length - busy.length} of ${voice.length}`;
}

function analysisLine(detail: SessionDetail): {
  action: string | null;
  text: string;
} | null {
  const { session } = detail;
  if (isAnalysisBusy(session)) {
    return { action: null, text: "Reading the session…" };
  }
  if (session.analysis.state === "failed") {
    const reason = session.analysis.error ?? "Unknown error.";
    return { action: "Try again", text: `Analysis failed: ${reason}` };
  }
  if (isAnalysisOutdated(session)) {
    return {
      action: "Analyze again",
      text: "The transcript changed since the analysis.",
    };
  }
  const canAnalyze =
    session.analysis.state === "idle" &&
    session.collection === "ended" &&
    detail.segments.length > 0;
  return canAnalyze ? { action: "Analyze", text: "Not analyzed yet." } : null;
}

function AnalysisNotice({
  detail,
  review,
}: {
  detail: SessionDetail;
  review: ReviewHandle;
}) {
  const { api } = useSessionWorkspace();
  const run = useSessionAction();
  const analysis = analysisLine(detail);
  if (!analysis) {
    return null;
  }
  const { session } = detail;

  const analyze = async () => {
    const status = await run("The analysis did not start", () =>
      api.analyze(session.id)
    );
    if (status) {
      review.patch((current) => ({
        ...current,
        session: { ...current.session, analysis: status },
      }));
    }
  };

  return (
    <div className="dt-actions">
      <p className={analysis.action === "Try again" ? "dt-error" : "dt-status"}>
        {analysis.text}
      </p>
      {analysis.action && session.canEdit && (
        <button className="dt-btn" onClick={analyze} type="button">
          {analysis.action}
        </button>
      )}
    </div>
  );
}

export function StatusStrip({
  detail,
  review,
}: {
  detail: SessionDetail;
  review: ReviewHandle;
}) {
  const { account } = useSessionWorkspace();
  const sync = useSyncStatus(account.key);
  const uploading =
    detail.session.isMine && sync.pendingOperations > 0
      ? `${sync.pendingOperations} waiting to upload`
      : null;
  const transcribing = transcribingLine(detail);

  return (
    <div aria-live="polite" className="dt-ses-strip">
      {uploading && <p className="dt-status">{uploading}</p>}
      {transcribing && <p className="dt-status">{transcribing}</p>}
      <AnalysisNotice detail={detail} review={review} />
    </div>
  );
}
