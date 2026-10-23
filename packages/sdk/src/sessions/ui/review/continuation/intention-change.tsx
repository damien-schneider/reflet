import { useState } from "react";
import type {
  ContinuedIntention,
  IntentionChange,
  IntentionChangeKind,
  SessionContinuation,
} from "../../../intention-protocol";
import { attributedText, formatClock } from "../../session-format";
import {
  type SaveProblem,
  SaveProblemMessage,
  useGuardedSave,
} from "../guarded-save";
import type { ProposalContext } from "../proposals/proposal-details";
import { FormActions, TextField } from "../proposals/proposal-editor";
import { EvidenceThumb } from "../transcript/evidence-thumb";
import { FIELD_LABELS, fieldValueText } from "./intention-history";
import { SharePreview } from "./share-preview";
import type { UpdateActions } from "./use-update-actions";

const KIND_LABELS: Record<IntentionChangeKind, string> = {
  constraint: "New constraint",
  contradiction: "Contradiction",
  outcome: "Observed result",
  precision: "Precision",
  solution: "Different solution",
};

export interface ChangeScope {
  actions: UpdateActions;
  context: ProposalContext;
  continuation: SessionContinuation;
}

function ChangeValue({
  change,
  intention,
}: {
  change: IntentionChange;
  intention: ContinuedIntention;
}) {
  if (change.operation === "add") {
    return <p className="dt-ses-diff">+ {change.value}</p>;
  }
  if (change.operation === "remove") {
    return <p className="dt-ses-diff">− {change.value}</p>;
  }
  return (
    <dl className="dt-ses-diff">
      <dt className="dt-ses-label">Current</dt>
      <dd>{fieldValueText(intention[change.field])}</dd>
      <dt className="dt-ses-label">Proposed</dt>
      <dd>{change.value}</dd>
    </dl>
  );
}

function ChangeSources({
  change,
  context,
}: {
  change: IntentionChange;
  context: ProposalContext;
}) {
  const segmentIds = new Set(change.segmentIds);
  const evidenceIds = new Set(change.evidenceIds);
  const segments = context.detail.segments.filter((segment) =>
    segmentIds.has(segment.id)
  );
  const evidence = context.detail.evidence.filter((item) =>
    evidenceIds.has(item.id)
  );
  return (
    <>
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
          {` “${attributedText(segment)}”`}
        </button>
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

type ChangeMode =
  | { kind: "idle" }
  | { kind: "editing" }
  | { kind: "sharing"; value: string | null };

function EditedValueForm({
  handlers,
  initialValue,
  isSaving,
  label,
}: {
  handlers: { onAccept: (value: string) => void; onCancel: () => void };
  initialValue: string;
  isSaving: boolean;
  label: string;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <form
      className="dt-ses-form"
      onSubmit={(event) => {
        event.preventDefault();
        handlers.onAccept(value.trim());
      }}
    >
      <TextField
        label={label}
        maxLength={2000}
        onChange={setValue}
        rows={3}
        value={value}
      />
      <FormActions
        isSubmitDisabled={isSaving || value.trim() === ""}
        onCancel={handlers.onCancel}
        submitLabel="Accept edited"
      />
    </form>
  );
}

interface PendingHandlers {
  onAccept: () => void;
  onEdit: () => void;
  onReject: () => void;
}

function PendingChoices({
  handlers,
  isSaving,
}: {
  handlers: PendingHandlers;
  isSaving: boolean;
}) {
  return (
    <div className="dt-actions">
      <button
        className="dt-btn"
        data-variant="primary"
        disabled={isSaving}
        onClick={handlers.onAccept}
        type="button"
      >
        Accept
      </button>
      <button className="dt-btn" onClick={handlers.onEdit} type="button">
        Edit then accept
      </button>
      <button className="dt-btn" onClick={handlers.onReject} type="button">
        Reject
      </button>
    </div>
  );
}

interface ChangeAcceptance {
  accept: (value: string | null, shareWithTeam: boolean) => void;
  isSaving: boolean;
  mode: ChangeMode;
  problem: SaveProblem | null;
  setMode: (mode: ChangeMode) => void;
}

function useChangeAcceptance(
  change: IntentionChange,
  scope: ChangeScope
): ChangeAcceptance {
  const [mode, setMode] = useState<ChangeMode>({ kind: "idle" });
  const { isSaving, problem, save } = useGuardedSave();
  const accept = (value: string | null, shareWithTeam: boolean) => {
    if (scope.continuation.contribution.needsShareConsent && !shareWithTeam) {
      setMode({ kind: "sharing", value });
      return;
    }
    save(() =>
      scope.actions.accept({ changeId: change.id, shareWithTeam, value })
    );
  };
  return { accept, isSaving, mode, problem, setMode };
}

function PendingForm({
  acceptance,
  change,
  scope,
}: {
  acceptance: ChangeAcceptance;
  change: IntentionChange;
  scope: ChangeScope;
}) {
  const { accept, isSaving, mode, setMode } = acceptance;
  const idle = () => setMode({ kind: "idle" });
  if (mode.kind === "sharing") {
    return (
      <SharePreview
        confirmation={{
          isBusy: isSaving,
          label: "Share and accept",
          onCancel: idle,
          onConfirm: () => accept(mode.value, true),
        }}
        detail={scope.context.detail}
        extracts={change}
      />
    );
  }
  if (mode.kind === "editing") {
    return (
      <EditedValueForm
        handlers={{ onAccept: (value) => accept(value, false), onCancel: idle }}
        initialValue={change.value}
        isSaving={isSaving}
        label={`${FIELD_LABELS[change.field]} (your version)`}
      />
    );
  }
  return (
    <PendingChoices
      handlers={{
        onAccept: () => accept(null, false),
        onEdit: () => setMode({ kind: "editing" }),
        onReject: () => scope.actions.decide(change.id, "rejected"),
      }}
      isSaving={isSaving}
    />
  );
}

function PendingActions({
  change,
  scope,
}: {
  change: IntentionChange;
  scope: ChangeScope;
}) {
  const acceptance = useChangeAcceptance(change, scope);
  return (
    <>
      <PendingForm acceptance={acceptance} change={change} scope={scope} />
      {acceptance.problem && (
        <SaveProblemMessage
          onReload={scope.context.review.reload}
          problem={acceptance.problem}
        />
      )}
    </>
  );
}

function ChangeDecision({
  change,
  scope,
}: {
  change: IntentionChange;
  scope: ChangeScope;
}) {
  if (change.decision === "accepted") {
    return <p className="dt-meta">Accepted</p>;
  }
  if (change.decision === "rejected") {
    return (
      <div className="dt-actions">
        <p className="dt-meta">Rejected</p>
        {scope.context.canEdit && (
          <button
            className="dt-btn"
            onClick={() => scope.actions.decide(change.id, "pending")}
            type="button"
          >
            Undo
          </button>
        )}
      </div>
    );
  }
  return scope.context.canEdit ? (
    <PendingActions change={change} scope={scope} />
  ) : null;
}

export function IntentionChangeRow({
  change,
  intention,
  scope,
}: {
  change: IntentionChange;
  intention: ContinuedIntention;
  scope: ChangeScope;
}) {
  return (
    <li className="dt-ses-change" data-decision={change.decision}>
      <div className="dt-ses-chips">
        <span className="dt-chip">{KIND_LABELS[change.kind]}</span>
        <span className="dt-chip">{FIELD_LABELS[change.field]}</span>
        {change.hypothesis && (
          <span className="dt-chip" data-tone="accent">
            Hypothesis
          </span>
        )}
      </div>
      <ChangeValue change={change} intention={intention} />
      <p className="dt-meta">{change.reason}</p>
      <ChangeSources change={change} context={scope.context} />
      <ChangeDecision change={change} scope={scope} />
    </li>
  );
}
