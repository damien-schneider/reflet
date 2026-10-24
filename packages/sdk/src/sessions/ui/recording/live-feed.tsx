import type { ReactNode } from "react";
import type {
  SessionDetail,
  SessionProposal,
  SessionSegment,
} from "../../protocol";
import type { RecorderSnapshot } from "../../recorder/session-recorder";
import { useSessionDetail } from "../review/use-session-detail";
import { attributedText, formatClock, isAnalysisBusy } from "../session-format";

function newestFirst<Item>(items: Item[]): Item[] {
  return [...items].reverse();
}

function heardPassages(detail: SessionDetail): SessionSegment[] {
  return detail.segments.filter(
    (segment) =>
      !(segment.transcription.state === "empty" && segment.text === "")
  );
}

function foundIntentions(detail: SessionDetail): SessionProposal[] {
  return detail.proposals.filter(
    (proposal) => proposal.mergedIntoId === null && proposal.attachment === null
  );
}

function PassageText({ segment }: { segment: SessionSegment }) {
  const { state } = segment.transcription;
  if (state === "pending" || state === "running") {
    return <span className="dt-meta">Transcribing…</span>;
  }
  if (state === "failed" || state === "expired") {
    return <span className="dt-error">Couldn't transcribe</span>;
  }
  return <span>{attributedText(segment)}</span>;
}

function listeningLabel(phase: RecorderSnapshot["phase"]): string {
  return phase === "paused" ? "Paused" : "Listening…";
}

function LiveColumn({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <div className="dt-rec-live-column">
      <h3 className="dt-ses-label">{title}</h3>
      {children}
    </div>
  );
}

function WaitingFeed({
  intentions,
  transcript,
}: {
  intentions: string;
  transcript: string;
}) {
  return (
    <>
      <LiveColumn title="Transcript">
        <p className="dt-meta">{transcript}</p>
      </LiveColumn>
      <LiveColumn title="Intentions">
        <p className="dt-meta">{intentions}</p>
      </LiveColumn>
    </>
  );
}

function TranscriptColumn({
  passages,
  phase,
}: {
  passages: SessionSegment[];
  phase: RecorderSnapshot["phase"];
}) {
  return (
    <LiveColumn title="Transcript">
      {passages.length === 0 ? (
        <p className="dt-meta">{listeningLabel(phase)}</p>
      ) : (
        <ol className="dt-rec-live-list">
          {newestFirst(passages).map((segment) => (
            <li key={segment.id}>
              <span className="dt-meta">{formatClock(segment.startMs)}</span>
              <PassageText segment={segment} />
            </li>
          ))}
        </ol>
      )}
    </LiveColumn>
  );
}

function AnalysisStatus({
  detail,
  hasIntentions,
}: {
  detail: SessionDetail;
  hasIntentions: boolean;
}) {
  const { analysis } = detail.session;
  if (isAnalysisBusy(detail.session)) {
    return <p className="dt-meta">Finding intentions…</p>;
  }
  if (analysis.state === "failed") {
    return (
      <p className="dt-error">
        Analysis failed: {analysis.error ?? "Unknown error."}
      </p>
    );
  }
  return hasIntentions ? null : <p className="dt-meta">None yet</p>;
}

function IntentionsColumn({ detail }: { detail: SessionDetail }) {
  const numbered = foundIntentions(detail).map((proposal, index) => ({
    number: index + 1,
    proposal,
  }));
  return (
    <LiveColumn title="Intentions">
      {numbered.length > 0 && (
        <ol aria-live="polite" className="dt-rec-live-list">
          {newestFirst(numbered).map(({ number, proposal }) => (
            <li key={proposal.id}>
              <span className="dt-rec-live-number">{number}</span>
              <span>{proposal.need}</span>
            </li>
          ))}
        </ol>
      )}
      <AnalysisStatus detail={detail} hasIntentions={numbered.length > 0} />
    </LiveColumn>
  );
}

function LoadedFeed({
  phase,
  sessionId,
}: {
  phase: RecorderSnapshot["phase"];
  sessionId: string;
}) {
  const { reload, state } = useSessionDetail(sessionId);
  if (state.kind === "failed" || state.kind === "missing") {
    return (
      <div className="dt-actions">
        <p className="dt-error">The live transcript didn't load.</p>
        <button className="dt-btn" onClick={reload} type="button">
          Retry
        </button>
      </div>
    );
  }
  if (state.kind === "loading") {
    return <WaitingFeed intentions="Loading…" transcript="Loading…" />;
  }
  return (
    <>
      <TranscriptColumn passages={heardPassages(state.detail)} phase={phase} />
      <IntentionsColumn detail={state.detail} />
    </>
  );
}

export function LiveFeed({ snapshot }: { snapshot: RecorderSnapshot }) {
  return (
    <section
      aria-label="Live transcript and intentions"
      className="dt-rec-live glass"
    >
      {snapshot.sessionId === null ? (
        <WaitingFeed
          intentions="None yet"
          transcript={listeningLabel(snapshot.phase)}
        />
      ) : (
        <LoadedFeed
          key={snapshot.sessionId}
          phase={snapshot.phase}
          sessionId={snapshot.sessionId}
        />
      )}
    </section>
  );
}
