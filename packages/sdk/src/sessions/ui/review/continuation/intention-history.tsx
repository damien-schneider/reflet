import type {
  AppliedChange,
  ContributionQuote,
  IntentionField,
  IntentionHistoryEntry,
} from "../../../intention-protocol";
import type { SessionEvidence } from "../../../protocol";
import { formatClock, formatDate } from "../../session-format";
import type { ProposalContext } from "../proposals/proposal-details";
import { EvidenceThumb } from "../transcript/evidence-thumb";

export const FIELD_LABELS: Record<IntentionField, string> = {
  need: "Need",
  observed: "Observed",
  response: "Considered response",
  setAside: "Set aside",
  unknowns: "To check",
};

export function fieldValueText(value: string | string[] | null): string {
  const text = Array.isArray(value) ? value.join("; ") : value;
  return text || "—";
}

export function AppliedChanges({ applied }: { applied: AppliedChange[] }) {
  if (applied.length === 0) {
    return null;
  }
  return (
    <ul className="dt-ses-rows">
      {applied.map((change) => (
        <li className="dt-ses-row" key={change.revision}>
          <p className="dt-meta">
            Accepted into revision {change.revision} by{" "}
            {change.byName ?? "a teammate"} · {formatDate(change.at)}
          </p>
          <ul className="dt-ses-list">
            {change.fields.map((field) => (
              <li key={field.field}>
                {FIELD_LABELS[field.field]}: {fieldValueText(field.before)} →{" "}
                {fieldValueText(field.after)}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function HistoryExtracts({
  evidence,
  quotes,
}: {
  evidence: SessionEvidence[];
  quotes: ContributionQuote[];
}) {
  return (
    <>
      {quotes.map((quote) => (
        <blockquote className="dt-ses-moment-quote" key={quote.segmentId}>
          <span className="dt-ses-time">{formatClock(quote.startMs)}</span>
          {` “${quote.text}”`}
          {quote.context.map((line) => (
            <span className="dt-meta dt-ses-context-line" key={line}>
              {line}
            </span>
          ))}
        </blockquote>
      ))}
      {evidence.length > 0 && (
        <div className="dt-ses-thumbs">
          {evidence.map((item) => (
            <EvidenceThumb evidence={item} key={item.id} />
          ))}
        </div>
      )}
    </>
  );
}

function entryTitle(entry: IntentionHistoryEntry): string {
  const { session } = entry;
  return entry.origin === "continuation"
    ? `Continued in “${session.title}” · ${formatDate(session.startedAt)}`
    : `Added from “${session.title}” · ${formatDate(session.startedAt)}`;
}

function HistoryEntry({
  context,
  entry,
}: {
  context: ProposalContext;
  entry: IntentionHistoryEntry;
}) {
  const evidenceIds = new Set(entry.evidenceIds);
  const evidence = context.detail.contributedEvidence.filter((item) =>
    evidenceIds.has(item.id)
  );
  return (
    <li
      className="dt-ses-history dt-openable"
      data-removed={entry.detachedAt !== null}
    >
      <p className="dt-ses-subhead">
        {entry.session.canOpen ? (
          <button
            className="dt-open"
            onClick={() => context.navigation.onOpenSession(entry.session.id)}
            title="Open session"
            type="button"
          >
            {entryTitle(entry)}
          </button>
        ) : (
          entryTitle(entry)
        )}
      </p>
      {entry.detachedAt !== null && (
        <p className="dt-meta">
          Removed on {formatDate(entry.detachedAt)}: what it added was taken
          back.
        </p>
      )}
      <AppliedChanges applied={entry.applied} />
      {entry.extractsHidden ? (
        <p className="dt-meta">Extracts are private to the author</p>
      ) : (
        <HistoryExtracts evidence={evidence} quotes={entry.quotes} />
      )}
    </li>
  );
}

export function IntentionHistory({
  context,
  intentionId,
}: {
  context: ProposalContext;
  intentionId: string;
}) {
  const entries = context.detail.history.filter(
    (entry) => entry.intentionId === intentionId
  );
  if (entries.length === 0) {
    return null;
  }
  return (
    <section>
      <h4 className="dt-ses-label">History</h4>
      <ul className="dt-ses-rows">
        {entries.map((entry) => (
          <HistoryEntry context={context} entry={entry} key={entry.id} />
        ))}
      </ul>
    </section>
  );
}
