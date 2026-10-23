import { useState } from "react";
import type { SessionContribution } from "../../../intention-protocol";
import { attributedText, formatClock, formatDate } from "../../session-format";
import type { ProposalContext } from "../proposals/proposal-details";
import type { ChangeScope } from "./intention-change";

type Verdict = NonNullable<SessionContribution["verdict"]>;

const VERDICT_LABELS: Record<Verdict["status"], string> = {
  insufficient: "Not enough evidence",
  needs_work: "Still to improve",
  resolved: "Looks resolved",
};

export function QuestionBox({ scope }: { scope: ChangeScope }) {
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { contribution } = scope.continuation;
  if (!contribution.question) {
    return null;
  }
  const send = async () => {
    setIsSending(true);
    try {
      if (await scope.actions.answer(text.trim())) {
        setText("");
      }
    } finally {
      setIsSending(false);
    }
  };
  return (
    <section className="dt-ses-form">
      <h4 className="dt-ses-label">Question</h4>
      <p className="dt-note-text">{contribution.question}</p>
      <ul className="dt-ses-list">
        {contribution.answers.map((answer) => (
          <li key={answer.at}>{answer.text}</li>
        ))}
      </ul>
      {scope.context.canEdit && (
        <>
          <textarea
            aria-label="Your answer"
            className="dt-field"
            maxLength={1000}
            onChange={(event) => setText(event.target.value)}
            rows={2}
            value={text}
          />
          <div className="dt-actions">
            <button
              className="dt-btn"
              disabled={isSending || text.trim() === ""}
              onClick={send}
              type="button"
            >
              Send answer
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function VerdictQuotes({
  context,
  segmentIds,
}: {
  context: ProposalContext;
  segmentIds: string[];
}) {
  const cited = new Set(segmentIds);
  return context.detail.segments
    .filter((segment) => cited.has(segment.id))
    .map((segment) => (
      <button
        className="dt-ses-quote"
        key={segment.id}
        onClick={(event) =>
          context.navigation.onShowMoment(segment.id, event.currentTarget)
        }
        type="button"
      >
        <span className="dt-ses-time">{formatClock(segment.startMs)}</span>
        {` “${attributedText(segment)}”`}
      </button>
    ));
}

const CHECK_LABELS = {
  needs_work: "needs more work",
  works: "works",
} as const;

export function VerdictBox({ scope }: { scope: ChangeScope }) {
  const { actions, context, continuation } = scope;
  const { verdict } = continuation.contribution;
  if (!verdict) {
    return null;
  }
  const verification = continuation.intention?.verification;
  const checkedHere =
    verification?.sessionId === context.detail.session.id ? verification : null;
  return (
    <section className="dt-ses-form">
      <h4 className="dt-ses-label">AI reading</h4>
      <p>
        <span className="dt-chip">{VERDICT_LABELS[verdict.status]}</span>{" "}
        {verdict.reason}
      </p>
      <VerdictQuotes context={context} segmentIds={verdict.segmentIds} />
      {checkedHere && (
        <p className="dt-meta" role="status">
          You confirmed it {CHECK_LABELS[checkedHere.status]} on{" "}
          {formatDate(checkedHere.at)}.
        </p>
      )}
      {context.canEdit && (
        <div className="dt-actions">
          <button
            className="dt-btn"
            onClick={() => actions.verify("works", verdict.reason)}
            type="button"
          >
            Confirm: works
          </button>
          <button
            className="dt-btn"
            onClick={() => actions.verify("needs_work", verdict.reason)}
            type="button"
          >
            Confirm: needs more work
          </button>
        </div>
      )}
    </section>
  );
}
