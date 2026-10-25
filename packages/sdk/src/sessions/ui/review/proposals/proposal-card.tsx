import { type ReactNode, useId, useState } from "react";
import { InboxIcon } from "../../../../devtools/client/devtools-icons";
import {
  CheckIcon,
  CloseIcon,
  PencilIcon,
} from "../../../../feedback/ui/icons";
import type { ProposalDecision, SessionProposal } from "../../../protocol";
import { ClockIcon } from "../../session-icons";
import { ContinueIntention } from "../continuation/continue-panel";
import { IntentionSource } from "../moment/intention-source";
import { useFocusWhen } from "../transcript/remove-evidence";
import {
  AttachedIntentionRow,
  IntentionSuggestionBanner,
} from "./intention-suggestion";
import {
  ListSection,
  type ProposalContext,
  ProposalDetails,
} from "./proposal-details";
import { ProposalEditor, ResponseEditor } from "./proposal-editor";
import { decisionToggle, quotedNeed } from "./use-proposal-actions";
import { Verification } from "./verification";

const DECISION_CHIPS: Partial<Record<ProposalDecision, string>> = {
  dismissed: "Dismissed",
  kept: "Confirmed",
  later: "Later",
};

const FORMULATION_CHIPS: Record<SessionProposal["formulation"], string> = {
  ai: "AI wording",
  human: "Your wording",
};

const ICON_DECISIONS: {
  decision: ProposalDecision;
  icon: ReactNode;
  label: string;
}[] = [
  { decision: "later", icon: <ClockIcon />, label: "Later" },
  { decision: "dismissed", icon: <CloseIcon />, label: "Dismiss" },
];

function ProposalChips({ proposal }: { proposal: SessionProposal }) {
  const decisionChip = DECISION_CHIPS[proposal.decision];
  const { handedOffRevision } = proposal;
  let briefChip: string | null = null;
  if (handedOffRevision !== null) {
    briefChip =
      proposal.revision > handedOffRevision
        ? "Changed since brief"
        : "In a brief";
  }
  return (
    <div className="dt-ses-chips">
      {decisionChip && <span className="dt-chip">{decisionChip}</span>}
      <span className="dt-chip">{FORMULATION_CHIPS[proposal.formulation]}</span>
      {proposal.certainty === "uncertain" && (
        <span className="dt-chip">Unclear</span>
      )}
      {proposal.needsReview && (
        <span className="dt-chip" data-tone="accent">
          To re-examine
        </span>
      )}
      {briefChip && <span className="dt-chip">{briefChip}</span>}
      {proposal.feedbackId !== null && (
        <span className="dt-chip">On the board</span>
      )}
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
  const toggle = (decision: ProposalDecision) =>
    decisionToggle(context.actions, proposal, decision);
  const isKept = proposal.decision === "kept";
  return (
    <div className="dt-actions dt-ses-decisions">
      <button
        aria-pressed={isKept}
        className="dt-btn"
        data-variant="primary"
        onClick={toggle("kept")}
        type="button"
      >
        <CheckIcon size={14} />
        Confirm
      </button>
      {ICON_DECISIONS.map(({ decision, icon, label }) => (
        <button
          aria-label={label}
          aria-pressed={proposal.decision === decision}
          className="dt-btn"
          data-icon-only
          key={decision}
          onClick={toggle(decision)}
          title={label}
          type="button"
        >
          {icon}
        </button>
      ))}
      <button
        aria-label="Edit"
        className="dt-btn"
        data-icon-only
        onClick={onEdit}
        title="Edit"
        type="button"
      >
        <PencilIcon />
      </button>
      {proposal.feedbackId === null && proposal.decision !== "dismissed" && (
        <button
          aria-label="Add to board"
          className="dt-btn"
          data-icon-only
          onClick={() => context.actions.addToBoard([proposal])}
          title="Add to board"
          type="button"
        >
          <InboxIcon />
        </button>
      )}
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

function ToCheck({ proposal }: { proposal: SessionProposal }) {
  const items = proposal.question
    ? [...proposal.unknowns, proposal.question]
    : proposal.unknowns;
  return <ListSection items={items} title="To check" />;
}

function ResponseBlock({
  context,
  proposal,
}: {
  context: ProposalContext;
  proposal: SessionProposal;
}) {
  const [isEditing, setIsEditing] = useState(false);
  if (isEditing) {
    return (
      <ResponseEditor
        onDone={() => setIsEditing(false)}
        proposal={proposal}
        review={context.review}
      />
    );
  }
  if (!proposal.response) {
    return context.canEdit ? (
      <button
        className="dt-ses-link"
        onClick={() => setIsEditing(true)}
        type="button"
      >
        Add a considered response
      </button>
    ) : null;
  }
  return (
    <section className="dt-ses-block">
      <h4 className="dt-ses-label">Considered response</h4>
      <p className="dt-note-text">{proposal.response}</p>
      {context.canEdit && (
        <button
          className="dt-ses-link"
          onClick={() => setIsEditing(true)}
          type="button"
        >
          Edit response
        </button>
      )}
    </section>
  );
}

function IntentionBody({
  context,
  disclosure,
  proposal,
}: {
  context: ProposalContext;
  disclosure: Disclosure;
  proposal: SessionProposal;
}) {
  return (
    <>
      <p className="dt-ses-need" data-expanded={disclosure.isExpanded}>
        {proposal.need}
      </p>
      <ProposalChips proposal={proposal} />
      <IntentionSource context={context} proposal={proposal} />
      <ResponseBlock context={context} proposal={proposal} />
      <ToCheck proposal={proposal} />
    </>
  );
}

function IntentionCard({
  context,
  onEdit,
  proposal,
}: {
  context: ProposalContext;
  onEdit: () => void;
  proposal: SessionProposal;
}) {
  const disclosure = useDisclosure();
  const cardRef = useFocusWhen<HTMLElement>(
    context.focusIntentionId === proposal.id
  );
  return (
    <article
      aria-label={`Intention: ${proposal.need}`}
      className="dt-card"
      data-decision={proposal.decision}
      ref={cardRef}
      tabIndex={-1}
    >
      <IntentionBody
        context={context}
        disclosure={disclosure}
        proposal={proposal}
      />
      <MergeSuggestion context={context} proposal={proposal} />
      <IntentionSuggestionBanner context={context} proposal={proposal} />
      {context.canEdit && (
        <DecisionButtons
          context={context}
          onEdit={onEdit}
          proposal={proposal}
        />
      )}
      <ContinueIntention context={context} proposal={proposal} />
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

export function ProposalCard({
  context,
  proposal,
}: {
  context: ProposalContext;
  proposal: SessionProposal;
}) {
  const [isEditing, setIsEditing] = useState(false);
  if (proposal.attachment) {
    return (
      <AttachedIntentionRow
        attachment={proposal.attachment}
        context={context}
      />
    );
  }
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
    <IntentionCard
      context={context}
      onEdit={() => setIsEditing(true)}
      proposal={proposal}
    />
  );
}
