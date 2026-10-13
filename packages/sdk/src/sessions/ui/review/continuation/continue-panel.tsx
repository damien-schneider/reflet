import { useId, useState } from "react";
import type { SessionProposal } from "../../../protocol";
import type { RecorderStartOptions } from "../../../recorder/session-recorder";
import {
  MicrophonePrompt,
  StartProblem,
  useRecorderStart,
} from "../../start/start-session";
import {
  ListSection,
  type ProposalContext,
} from "../proposals/proposal-details";
import { useFocusWhen } from "../transcript/remove-evidence";

const MAX_TITLE_NEED_CHARS = 80;

function continuationOf(proposal: SessionProposal): RecorderStartOptions {
  return {
    continues: { intentionId: proposal.id, revision: proposal.revision },
    title: continueTitle(proposal.need),
  };
}

function continueTitle(need: string): string {
  const clipped =
    need.length > MAX_TITLE_NEED_CHARS
      ? `${need.slice(0, MAX_TITLE_NEED_CHARS - 1)}…`
      : need;
  return `Continue: ${clipped}`;
}

function IntentionRecap({ proposal }: { proposal: SessionProposal }) {
  const stillOpen = proposal.question
    ? [...proposal.unknowns, proposal.question]
    : proposal.unknowns;
  return (
    <>
      <p className="dt-note-text">{proposal.need}</p>
      {proposal.response && (
        <section>
          <h5 className="dt-ses-label">Considered response</h5>
          <p className="dt-note-text">{proposal.response}</p>
        </section>
      )}
      <ListSection items={stillOpen} title="Still open" />
      <p className="dt-meta">
        Speak to refine the need or check the result. Nothing is sent to an
        agent.
      </p>
    </>
  );
}

function ContinuePanel({
  onCancel,
  onStarted,
  proposal,
}: {
  onCancel: () => void;
  onStarted: () => void;
  proposal: SessionProposal;
}) {
  const headingId = useId();
  const headingRef = useFocusWhen<HTMLHeadingElement>(true);
  const { failure, isBusy, isRequesting, start } = useRecorderStart(onStarted);
  const startContinuation = () => start(continuationOf(proposal));
  return (
    <section aria-labelledby={headingId} className="dt-ses-banner">
      <h4
        className="dt-ses-subhead"
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
      >
        Continue this intention
      </h4>
      <IntentionRecap proposal={proposal} />
      <MicrophonePrompt isRequesting={isRequesting} />
      {failure && (
        <StartProblem failure={failure} onRetry={startContinuation} />
      )}
      <div className="dt-actions">
        {!failure && (
          <button
            className="dt-btn"
            data-variant="primary"
            disabled={isBusy}
            onClick={startContinuation}
            type="button"
          >
            Start session
          </button>
        )}
        <button className="dt-btn" onClick={onCancel} type="button">
          Cancel
        </button>
      </div>
    </section>
  );
}

export function ContinueIntention({
  context,
  proposal,
}: {
  context: ProposalContext;
  proposal: SessionProposal;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasClosed, setHasClosed] = useState(false);
  const buttonRef = useFocusWhen<HTMLButtonElement>(hasClosed && !isOpen);
  const canContinue =
    context.canEdit &&
    proposal.decision !== "dismissed" &&
    proposal.mergedIntoId === null &&
    proposal.attachment === null;
  if (!canContinue) {
    return null;
  }
  if (isOpen) {
    return (
      <ContinuePanel
        onCancel={() => {
          setIsOpen(false);
          setHasClosed(true);
        }}
        onStarted={context.navigation.onStarted}
        proposal={proposal}
      />
    );
  }
  return (
    <div className="dt-actions">
      <button
        className="dt-btn"
        onClick={() => {
          setIsOpen(true);
          setHasClosed(false);
        }}
        ref={buttonRef}
        type="button"
      >
        Continue this intention
      </button>
    </div>
  );
}
