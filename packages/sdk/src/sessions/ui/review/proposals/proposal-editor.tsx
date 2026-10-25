import { useState } from "react";
import type { EditProposalBody } from "../../../api/session-api";
import type { SessionProposal } from "../../../protocol";
import { useSessionWorkspace } from "../../session-workspace";
import { submitOnModEnter } from "../../submit-shortcut";
import { SaveProblemMessage, useGuardedSave } from "../guarded-save";
import { type ReviewHandle, withProposal } from "../use-session-detail";

const MAX_LIST_ITEMS = 8;

interface ProposalDraft {
  need: string;
  observed: string;
  response: string;
  setAside: string;
  unknowns: string;
}

function lines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .slice(0, MAX_LIST_ITEMS);
}

function editBody(
  proposal: SessionProposal,
  draft: ProposalDraft
): EditProposalBody {
  return {
    expectedRevision: proposal.revision,
    need: draft.need.trim(),
    observed: draft.observed.trim(),
    proposalId: proposal.id,
    response: draft.response.trim() || null,
    setAside: lines(draft.setAside),
    unknowns: lines(draft.unknowns),
  };
}

export function TextField({
  label,
  maxLength,
  onChange,
  rows,
  value,
}: {
  label: string;
  maxLength: number;
  onChange: (value: string) => void;
  rows: number;
  value: string;
}) {
  return (
    <label className="dt-ses-field">
      <span>{label}</span>
      <textarea
        className="dt-field"
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={submitOnModEnter}
        rows={rows}
        value={value}
      />
    </label>
  );
}

export function FormActions({
  isSubmitDisabled,
  onCancel,
  submitLabel,
}: {
  isSubmitDisabled: boolean;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div className="dt-actions">
      <button
        className="dt-btn"
        data-variant="primary"
        disabled={isSubmitDisabled}
        type="submit"
      >
        {submitLabel}
      </button>
      <button className="dt-btn" onClick={onCancel} type="button">
        Cancel
      </button>
    </div>
  );
}

interface DraftFieldProps {
  onChange: (value: string) => void;
  value: string;
}

type DraftField = (key: keyof ProposalDraft) => DraftFieldProps;

function useProposalDraft(proposal: SessionProposal) {
  const [draft, setDraft] = useState<ProposalDraft>({
    need: proposal.need,
    observed: proposal.observed,
    response: proposal.response ?? "",
    setAside: proposal.setAside.join("\n"),
    unknowns: proposal.unknowns.join("\n"),
  });
  const field: DraftField = (key) => ({
    onChange: (value: string) =>
      setDraft((current) => ({ ...current, [key]: value })),
    value: draft[key],
  });
  return { draft, field };
}

function ProposalDraftFields({ field }: { field: DraftField }) {
  return (
    <>
      <TextField label="Need" maxLength={300} rows={2} {...field("need")} />
      <TextField
        label="Observed"
        maxLength={2000}
        rows={3}
        {...field("observed")}
      />
      <TextField
        label="Considered response"
        maxLength={1000}
        rows={2}
        {...field("response")}
      />
      <TextField
        label="Unknowns (one per line)"
        maxLength={2400}
        rows={2}
        {...field("unknowns")}
      />
      <TextField
        label="Set aside (one per line)"
        maxLength={2400}
        rows={2}
        {...field("setAside")}
      />
    </>
  );
}

export function ProposalEditor({
  onDone,
  proposal,
  review,
}: {
  onDone: () => void;
  proposal: SessionProposal;
  review: ReviewHandle;
}) {
  const { api } = useSessionWorkspace();
  const { isSaving, problem, save } = useGuardedSave();
  const { draft, field } = useProposalDraft(proposal);
  const submit = () =>
    save(async () => {
      const saved = await api.editProposal(editBody(proposal, draft));
      review.patch((detail) => withProposal(detail, saved));
      onDone();
    });

  return (
    <form
      className="dt-ses-form"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <ProposalDraftFields field={field} />
      {problem && (
        <SaveProblemMessage onReload={review.reload} problem={problem} />
      )}
      <FormActions
        isSubmitDisabled={isSaving || draft.need.trim() === ""}
        onCancel={onDone}
        submitLabel="Save"
      />
    </form>
  );
}

export function ResponseEditor({
  onDone,
  proposal,
  review,
}: {
  onDone: () => void;
  proposal: SessionProposal;
  review: ReviewHandle;
}) {
  const { api } = useSessionWorkspace();
  const { isSaving, problem, save } = useGuardedSave();
  const [response, setResponse] = useState(proposal.response ?? "");
  const submit = () =>
    save(async () => {
      const saved = await api.editProposal({
        expectedRevision: proposal.revision,
        proposalId: proposal.id,
        response: response.trim() || null,
      });
      review.patch((detail) => withProposal(detail, saved));
      onDone();
    });

  return (
    <form
      className="dt-ses-form"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <TextField
        label="Considered response"
        maxLength={1000}
        onChange={setResponse}
        rows={3}
        value={response}
      />
      {problem && (
        <SaveProblemMessage onReload={review.reload} problem={problem} />
      )}
      <FormActions
        isSubmitDisabled={isSaving}
        onCancel={onDone}
        submitLabel="Save response"
      />
    </form>
  );
}
