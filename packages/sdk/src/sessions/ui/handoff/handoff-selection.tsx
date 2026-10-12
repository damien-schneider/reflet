import type { ReactNode } from "react";
import type {
  SessionDetail,
  SessionEvidence,
  SessionProposal,
} from "../../protocol";
import { evidenceCaption } from "../review/transcript/evidence-thumb";
import { formatClock } from "../session-format";

export interface HandoffSelection {
  evidenceIds: string[];
  proposalIds: string[];
}

export function keptProposals(detail: SessionDetail): SessionProposal[] {
  return detail.proposals.filter(
    (proposal) => proposal.decision === "kept" && proposal.mergedIntoId === null
  );
}

export function evidenceOf(
  detail: SessionDetail,
  proposals: SessionProposal[]
): SessionEvidence[] {
  const cited = new Set(proposals.flatMap((proposal) => proposal.evidenceIds));
  return detail.evidence.filter(
    (item) => cited.has(item.id) && item.status === "available"
  );
}

export function initialSelection(detail: SessionDetail): HandoffSelection {
  const proposals = keptProposals(detail);
  return {
    evidenceIds: evidenceOf(detail, proposals).map((item) => item.id),
    proposalIds: proposals.map((proposal) => proposal.id),
  };
}

function toggled(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((other) => other !== id) : [...ids, id];
}

function CheckRow({
  isChecked,
  label,
  onToggle,
}: {
  isChecked: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <li>
      <label className="dt-ses-check">
        <input checked={isChecked} onChange={onToggle} type="checkbox" />
        <span>{label}</span>
      </label>
    </li>
  );
}

function ChoiceGroup({
  children,
  legend,
}: {
  children: ReactNode;
  legend: string;
}) {
  return (
    <fieldset className="dt-ses-choices">
      <legend className="dt-ses-label">{legend}</legend>
      <ul className="dt-ses-list">{children}</ul>
    </fieldset>
  );
}

export function HandoffChoices({
  detail,
  onChange,
  selection,
}: {
  detail: SessionDetail;
  onChange: (selection: HandoffSelection) => void;
  selection: HandoffSelection;
}) {
  const proposals = keptProposals(detail);
  const evidence = evidenceOf(detail, proposals);
  const toggleProposal = (id: string) =>
    onChange({ ...selection, proposalIds: toggled(selection.proposalIds, id) });
  const toggleEvidence = (id: string) =>
    onChange({ ...selection, evidenceIds: toggled(selection.evidenceIds, id) });
  const chosenProposalIds = new Set(selection.proposalIds);
  const chosenEvidenceIds = new Set(selection.evidenceIds);
  return (
    <>
      <ChoiceGroup legend="Proposals">
        {proposals.map((proposal) => (
          <CheckRow
            isChecked={chosenProposalIds.has(proposal.id)}
            key={proposal.id}
            label={proposal.need}
            onToggle={() => toggleProposal(proposal.id)}
          />
        ))}
      </ChoiceGroup>
      {evidence.length > 0 && (
        <ChoiceGroup legend="Evidence">
          {evidence.map((item) => (
            <CheckRow
              isChecked={chosenEvidenceIds.has(item.id)}
              key={item.id}
              label={`${formatClock(item.atMs)} · ${evidenceCaption(item)}`}
              onToggle={() => toggleEvidence(item.id)}
            />
          ))}
        </ChoiceGroup>
      )}
    </>
  );
}
