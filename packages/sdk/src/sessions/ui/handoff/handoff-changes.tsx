import type { LastHandoff } from "../../intention-protocol";
import type {
  SessionDetail,
  SessionHandoff,
  SessionProposal,
} from "../../protocol";
import { fieldValueText } from "../review/continuation/intention-history";
import { countLabel, formatDate } from "../session-format";

interface FieldDifference {
  after: string;
  before: string;
  label: string;
}

function differences(
  proposal: SessionProposal,
  last: LastHandoff
): FieldDifference[] {
  const pairs = [
    { after: proposal.need, before: last.need, label: "Need" },
    {
      after: fieldValueText(proposal.response),
      before: fieldValueText(last.response),
      label: "Considered response",
    },
    {
      after: fieldValueText(proposal.unknowns),
      before: last.unknowns === null ? null : fieldValueText(last.unknowns),
      label: "To check",
    },
  ];
  return pairs.flatMap(({ after, before, label }) =>
    before === null || before === after ? [] : [{ after, before, label }]
  );
}

function ChangeSummary({
  last,
  proposal,
}: {
  last: LastHandoff;
  proposal: SessionProposal;
}) {
  return (
    <li className="dt-ses-row">
      <p className="dt-ses-subhead">{proposal.need}</p>
      <p className="dt-meta">
        Changed since the brief of {formatDate(last.at)} (revision{" "}
        {last.revision} → {proposal.revision})
      </p>
      <ul className="dt-ses-list">
        {differences(proposal, last).map((difference) => (
          <li key={difference.label}>
            {difference.label}: {difference.before} → {difference.after}
          </li>
        ))}
      </ul>
    </li>
  );
}

export function ChangedSinceBriefs({
  detail,
  proposalIds,
}: {
  detail: SessionDetail;
  proposalIds: string[];
}) {
  const selected = new Set(proposalIds);
  const changed = detail.proposals.flatMap((proposal) => {
    const last = proposal.lastHandoff;
    return selected.has(proposal.id) &&
      last &&
      last.revision < proposal.revision
      ? [{ last, proposal }]
      : [];
  });
  if (changed.length === 0) {
    return null;
  }
  return (
    <ul className="dt-ses-rows">
      {changed.map(({ last, proposal }) => (
        <ChangeSummary key={proposal.id} last={last} proposal={proposal} />
      ))}
    </ul>
  );
}

function deliveryLine(handoff: SessionHandoff): string {
  const kinds = new Set(handoff.deliveries.map((delivery) => delivery.kind));
  if (kinds.size === 0) {
    return "not copied or exported";
  }
  return [...kinds].join(" and ");
}

function intentionsLine(handoff: SessionHandoff): string {
  const [only, ...others] = handoff.proposals;
  if (only && others.length === 0) {
    return `“${only.need}” revision ${only.revision}`;
  }
  return countLabel(handoff.proposals.length, "intention");
}

export function PreviousBriefs({ handoffs }: { handoffs: SessionHandoff[] }) {
  if (handoffs.length === 0) {
    return null;
  }
  return (
    <section className="dt-ses-form">
      <h3 className="dt-ses-label">Previous briefs</h3>
      <ul className="dt-ses-rows">
        {handoffs.map((handoff) => {
          const date = formatDate(handoff.createdAt);
          return (
            <li key={handoff.id}>
              <details>
                <summary>
                  {date} · {intentionsLine(handoff)} · {deliveryLine(handoff)}
                </summary>
                <textarea
                  aria-label={`Brief of ${date}`}
                  className="dt-field dt-ses-brief"
                  readOnly
                  rows={8}
                  value={handoff.brief}
                />
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
