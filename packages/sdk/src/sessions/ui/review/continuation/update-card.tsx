import { useId, useState } from "react";
import type {
  ContinuedIntention,
  SessionContinuation,
  SessionContribution,
} from "../../../intention-protocol";
import type { ProposalContext } from "../proposals/proposal-details";
import { type ChangeScope, IntentionChangeRow } from "./intention-change";
import { AppliedChanges } from "./intention-history";
import { useUpdateActions } from "./use-update-actions";
import { QuestionBox, VerdictBox } from "./verdict";

const DETACH_COPY =
  "Remove what this session added to the intention? Each field that still holds the value this session set goes back to its previous value. Fields changed since then are kept, and the intention is marked to re-examine.";

const INTENTION_DELETED =
  "The intention this session continued was deleted. This session stays as it was recorded.";
const INTENTION_HIDDEN =
  "The intention this session continued is no longer visible to you.";

export function ContinuationHeader({
  continuation,
  onOpenSession,
}: {
  continuation: SessionContinuation;
  onOpenSession: (sessionId: string) => void;
}) {
  const { contribution, intention } = continuation;
  if (!intention) {
    return (
      <p className="dt-meta">
        {contribution.detachedAt === null
          ? INTENTION_HIDDEN
          : INTENTION_DELETED}
      </p>
    );
  }
  return (
    <div className="dt-ses-banner">
      <p>Continues “{intention.need}”</p>
      <div className="dt-actions">
        <button
          className="dt-btn"
          onClick={() => onOpenSession(intention.sessionId)}
          type="button"
        >
          Open the intention
        </button>
      </div>
    </div>
  );
}

function ContributionState({
  contribution,
}: {
  contribution: SessionContribution;
}) {
  if (contribution.state === "recording") {
    return (
      <p className="dt-status">
        This session is still recording. What it changes appears once it ends.
      </p>
    );
  }
  if (contribution.state === "no_change") {
    return <p className="dt-meta">No change to the intention</p>;
  }
  return null;
}

function DetachContribution({ scope }: { scope: ChangeScope }) {
  const [isConfirming, setIsConfirming] = useState(false);
  if (!isConfirming) {
    return (
      <div className="dt-actions">
        <button
          className="dt-btn"
          data-variant="danger"
          onClick={() => setIsConfirming(true)}
          type="button"
        >
          Remove this session's contribution
        </button>
      </div>
    );
  }
  return (
    <div className="dt-ses-banner">
      <p>{DETACH_COPY}</p>
      <div className="dt-actions">
        <button
          className="dt-btn"
          data-variant="danger"
          onClick={scope.actions.detach}
          type="button"
        >
          Remove contribution
        </button>
        <button
          className="dt-btn"
          onClick={() => setIsConfirming(false)}
          type="button"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ContributionBody({
  intention,
  scope,
}: {
  intention: ContinuedIntention;
  scope: ChangeScope;
}) {
  const { contribution } = scope.continuation;
  return (
    <>
      <ContributionState contribution={contribution} />
      {contribution.stale && (
        <p className="dt-ses-banner" role="status">
          The intention changed since this comparison: it is now at revision{" "}
          {intention.revision}. Check each change against it.
        </p>
      )}
      {contribution.state === "ready" && (
        <ul className="dt-ses-rows">
          {contribution.changes.map((change) => (
            <IntentionChangeRow
              change={change}
              intention={intention}
              key={change.id}
              scope={scope}
            />
          ))}
        </ul>
      )}
      <QuestionBox scope={scope} />
      <VerdictBox scope={scope} />
      <AppliedChanges applied={contribution.applied} />
      {scope.context.canEdit && <DetachContribution scope={scope} />}
    </>
  );
}

export function UpdateCard({
  context,
  continuation,
}: {
  context: ProposalContext;
  continuation: SessionContinuation;
}) {
  const headingId = useId();
  const actions = useUpdateActions({ context, continuation });
  const { contribution, intention } = continuation;
  if (!intention) {
    return null;
  }
  const scope: ChangeScope = { actions, context, continuation };
  return (
    <article aria-labelledby={headingId} className="dt-card">
      <h3 className="dt-ses-subhead" id={headingId}>
        What changes
      </h3>
      {contribution.detachedAt === null ? (
        <ContributionBody intention={intention} scope={scope} />
      ) : (
        <p className="dt-meta">
          This session's contribution was removed from the intention.
        </p>
      )}
    </article>
  );
}
