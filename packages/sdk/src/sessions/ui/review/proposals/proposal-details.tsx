import { useState } from "react";
import type { SessionDetail, SessionProposal } from "../../../protocol";
import { formatClock } from "../../session-format";
import { IntentionHistory } from "../continuation/intention-history";
import { EvidenceThumb } from "../transcript/evidence-thumb";
import type { ReviewHandle } from "../use-session-detail";
import { DeleteIntention } from "./delete-intention";
import type { ProposalActions } from "./use-proposal-actions";

export type ShowMoment = (segmentId: string, opener?: HTMLElement) => void;

export interface ReviewNavigation {
  onOpenSession: (sessionId: string) => void;
  onShowMoment: ShowMoment;
  onStarted: () => void;
}

export interface ProposalContext {
  actions: ProposalActions;
  canEdit: boolean;
  detail: SessionDetail;
  focusIntentionId: string | null;
  navigation: ReviewNavigation;
  review: ReviewHandle;
}

export function ListSection({
  items,
  title,
}: {
  items: string[];
  title: string;
}) {
  if (items.length === 0) {
    return null;
  }
  return (
    <section>
      <h4 className="dt-ses-label">{title}</h4>
      <ul className="dt-ses-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function RefinementState({
  onRetry,
  proposal,
}: {
  onRetry: () => void;
  proposal: SessionProposal;
}) {
  const { refinement } = proposal;
  if (refinement?.state === "running") {
    return <p className="dt-status">Refining…</p>;
  }
  if (refinement?.state === "outdated") {
    return (
      <p className="dt-meta">
        The intention changed while it was being refined. Add your precision
        again.
      </p>
    );
  }
  if (refinement?.state !== "failed") {
    return null;
  }
  return (
    <div className="dt-actions">
      <p className="dt-error">
        Refining failed: {refinement.error ?? "Unknown error."}
      </p>
      <button className="dt-btn" onClick={onRetry} type="button">
        Retry
      </button>
    </div>
  );
}

function ClarifyBox({
  context,
  proposal,
}: {
  context: ProposalContext;
  proposal: SessionProposal;
}) {
  const [text, setText] = useState("");
  const isRefining = proposal.refinement?.state === "running";
  const lastClarification = proposal.clarifications.at(-1)?.text;
  const send = async (value: string) => {
    const sent = await context.actions.clarify(proposal, value);
    if (sent) {
      setText("");
    }
  };

  return (
    <div className="dt-ses-form">
      {proposal.question && <p className="dt-note-text">{proposal.question}</p>}
      <textarea
        aria-label={proposal.question ? "Your answer" : "Add a precision…"}
        className="dt-field"
        disabled={isRefining}
        maxLength={1000}
        onChange={(event) => setText(event.target.value)}
        placeholder="Add a precision…"
        rows={2}
        value={text}
      />
      <div className="dt-actions">
        <button
          className="dt-btn"
          disabled={isRefining || text.trim() === ""}
          onClick={() => send(text.trim())}
          type="button"
        >
          Update intention
        </button>
      </div>
      <RefinementState
        onRetry={() => lastClarification && send(lastClarification)}
        proposal={proposal}
      />
    </div>
  );
}

function Sources({
  context,
  proposal,
}: {
  context: ProposalContext;
  proposal: SessionProposal;
}) {
  const segmentIds = new Set(proposal.segmentIds);
  const evidenceIds = new Set(proposal.evidenceIds);
  const segments = context.detail.segments.filter((segment) =>
    segmentIds.has(segment.id)
  );
  const evidence = context.detail.evidence.filter((item) =>
    evidenceIds.has(item.id)
  );
  if (segments.length + evidence.length === 0) {
    return null;
  }
  return (
    <section>
      <h4 className="dt-ses-label">Sources</h4>
      {segments.map((segment) => (
        <button
          className="dt-ses-quote"
          key={segment.id}
          onClick={(event) =>
            context.navigation.onShowMoment(segment.id, event.currentTarget)
          }
          type="button"
        >
          <span className="dt-ses-time">{formatClock(segment.startMs)}</span>
          {` “${segment.text}”`}
        </button>
      ))}
      <div className="dt-ses-thumbs">
        {evidence.map((item) => (
          <EvidenceThumb evidence={item} key={item.id} />
        ))}
      </div>
    </section>
  );
}

export function ProposalDetails({
  context,
  proposal,
}: {
  context: ProposalContext;
  proposal: SessionProposal;
}) {
  return (
    <>
      <section>
        <h4 className="dt-ses-label">What you said or showed — not verified</h4>
        <p className="dt-note-text">{proposal.observed}</p>
      </section>
      <ListSection items={proposal.setAside} title="Set aside" />
      {context.canEdit && <ClarifyBox context={context} proposal={proposal} />}
      <Sources context={context} proposal={proposal} />
      <IntentionHistory context={context} intentionId={proposal.id} />
      {context.canEdit && (
        <DeleteIntention context={context} proposal={proposal} />
      )}
    </>
  );
}
