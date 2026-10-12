import { useId, useState } from "react";
import type { ProposalDecision, SessionProposal } from "../../../protocol";
import { type ProposalContext, ProposalDetails } from "./proposal-details";
import { ProposalEditor } from "./proposal-editor";
import { quotedNeed } from "./use-proposal-actions";
import { Verification } from "./verification";

const DECISION_CHIPS: Partial<Record<ProposalDecision, string>> = {
  dismissed: "Dismissed",
  kept: "Kept",
  later: "Later",
};

const DECISION_BUTTONS: { decision: ProposalDecision; label: string }[] = [
  { decision: "kept", label: "Keep" },
  { decision: "later", label: "Later" },
  { decision: "dismissed", label: "Dismiss" },
];

function ProposalChips({ proposal }: { proposal: SessionProposal }) {
  const decisionChip = DECISION_CHIPS[proposal.decision];
  const { handedOffRevision } = proposal;
  let handoffChip: string | null = null;
  if (handedOffRevision !== null) {
    handoffChip =
      proposal.revision > handedOffRevision
        ? "Changed since handoff"
        : `Handed off rev ${handedOffRevision}`;
  }
  return (
    <div className="dt-ses-chips">
      {proposal.certainty === "uncertain" && (
        <span className="dt-chip">Unclear</span>
      )}
      {proposal.needsReview && (
        <span className="dt-chip" data-tone="accent">
          Needs review
        </span>
      )}
      {decisionChip && <span className="dt-chip">{decisionChip}</span>}
      {handoffChip && <span className="dt-chip">{handoffChip}</span>}
    </div>
  );
}

function MergeSuggestion({
  context,
  proposal,
}: {
  context: ProposalContext;
  proposal: SessionProposal;
}) {
  const suggestion = proposal.mergeSuggestion;
  if (!suggestion) {
    return null;
  }
  const suggestedIds = new Set(suggestion.withIds);
  const others = context.detail.proposals.filter(
    (other) => suggestedIds.has(other.id) && other.mergedIntoId === null
  );
  if (others.length === 0) {
    return null;
  }
  const names = others.map((other) => quotedNeed(other.need)).join(", ");
  return (
    <div className="dt-ses-banner">
      <p>Looks like the same need as {names}.</p>
      <p className="dt-meta">{suggestion.reason}</p>
      {context.canEdit && (
        <div className="dt-actions">
          <button
            className="dt-btn"
            onClick={() =>
              context.actions.merge(
                proposal.id,
                others.map((other) => other.id)
              )
            }
            type="button"
          >
            Merge
          </button>
          <button
            className="dt-btn"
            onClick={() => context.actions.separate(proposal.id)}
            type="button"
          >
            Keep separate
          </button>
        </div>
      )}
    </div>
  );
}

function DecisionButtons({
  context,
  onEdit,
  proposal,
}: {
  context: ProposalContext;
  onEdit: () => void;
  proposal: SessionProposal;
}) {
  return (
    <div className="dt-actions">
      {DECISION_BUTTONS.map(({ decision, label }) => (
        <button
          aria-pressed={proposal.decision === decision}
          className="dt-btn"
          data-variant={decision === "kept" ? "primary" : undefined}
          disabled={proposal.decision === decision}
          key={decision}
          onClick={() => context.actions.decide(proposal, decision)}
          type="button"
        >
          {label}
        </button>
      ))}
      <button className="dt-btn" onClick={onEdit} type="button">
        Edit
      </button>
    </div>
  );
}

interface Disclosure {
  detailsId: string;
  isExpanded: boolean;
  toggle: () => void;
}

function useDisclosure(): Disclosure {
  const [isExpanded, setIsExpanded] = useState(false);
  const detailsId = useId();
  return { detailsId, isExpanded, toggle: () => setIsExpanded(!isExpanded) };
}

function DetailsDisclosure({
  context,
  disclosure,
  proposal,
}: {
  context: ProposalContext;
  disclosure: Disclosure;
  proposal: SessionProposal;
}) {
  const { detailsId, isExpanded, toggle } = disclosure;
  return (
    <>
      <button
        aria-controls={detailsId}
        aria-expanded={isExpanded}
        className="dt-ses-link"
        onClick={toggle}
        type="button"
      >
        {isExpanded ? "Hide details" : "Show details"}
      </button>
      <div className="dt-ses-details" hidden={!isExpanded} id={detailsId}>
        {isExpanded && (
          <ProposalDetails context={context} proposal={proposal} />
        )}
      </div>
    </>
  );
}

export function ProposalCard({
  context,
  proposal,
}: {
  context: ProposalContext;
  proposal: SessionProposal;
}) {
  const disclosure = useDisclosure();
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <article className="dt-card">
        <ProposalEditor
          key={proposal.revision}
          onDone={() => setIsEditing(false)}
          proposal={proposal}
          review={context.review}
        />
      </article>
    );
  }
  return (
    <article className="dt-card" data-decision={proposal.decision}>
      <p className="dt-ses-need" data-expanded={disclosure.isExpanded}>
        {proposal.need}
      </p>
      <ProposalChips proposal={proposal} />
      <MergeSuggestion context={context} proposal={proposal} />
      {context.canEdit && (
        <DecisionButtons
          context={context}
          onEdit={() => setIsEditing(true)}
          proposal={proposal}
        />
      )}
      <DetailsDisclosure
        context={context}
        disclosure={disclosure}
        proposal={proposal}
      />
      {context.canEdit && (
        <Verification context={context} proposal={proposal} />
      )}
    </article>
  );
}
