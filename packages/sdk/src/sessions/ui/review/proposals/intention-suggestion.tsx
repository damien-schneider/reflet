import { useState } from "react";
import { announce } from "../../../../devtools/client/notices";
import type { IntentionSuggestion } from "../../../intention-protocol";
import type { SessionProposal } from "../../../protocol";
import { useSessionAction, useSessionWorkspace } from "../../session-workspace";
import { SharePreview } from "../continuation/share-preview";
import type { ProposalContext } from "./proposal-details";
import { quotedNeed } from "./use-proposal-actions";

function useAttach(context: ProposalContext, proposal: SessionProposal) {
  const [isBusy, setIsBusy] = useState(false);
  const attach = async (
    suggestion: IntentionSuggestion,
    shareWithTeam: boolean
  ) => {
    setIsBusy(true);
    try {
      const attached = await context.actions.save(
        "The session was not added to the intention",
        (api) =>
          api.attachToIntention({
            intentionId: suggestion.intentionId,
            proposalId: proposal.id,
            ...(shareWithTeam ? { shareWithTeam } : {}),
          })
      );
      if (attached) {
        announce(`Added to ${quotedNeed(suggestion.need)}`);
      }
    } finally {
      setIsBusy(false);
    }
  };
  const keepSeparate = () =>
    context.actions.save("The suggestion was not cleared", (api) =>
      api.keepSeparate(proposal.id)
    );
  return { attach, isBusy, keepSeparate };
}

function SuggestionChoices({
  canEdit,
  handlers,
  suggestion,
}: {
  canEdit: boolean;
  handlers: { isBusy: boolean; onAdd: () => void; onKeepSeparate: () => void };
  suggestion: IntentionSuggestion;
}) {
  return (
    <div className="dt-ses-banner">
      <p>
        Might belong to “{suggestion.need}” (from “{suggestion.sessionTitle}”):{" "}
        {suggestion.reason}
      </p>
      {canEdit && (
        <div className="dt-actions">
          <button
            className="dt-btn"
            disabled={handlers.isBusy}
            onClick={handlers.onAdd}
            type="button"
          >
            Add to this intention
          </button>
          <button
            className="dt-btn"
            onClick={handlers.onKeepSeparate}
            type="button"
          >
            Keep separate
          </button>
        </div>
      )}
    </div>
  );
}

export function IntentionSuggestionBanner({
  context,
  proposal,
}: {
  context: ProposalContext;
  proposal: SessionProposal;
}) {
  const [isPreviewing, setIsPreviewing] = useState(false);
  const { attach, isBusy, keepSeparate } = useAttach(context, proposal);
  const suggestion = proposal.intentionSuggestion;
  if (!suggestion) {
    return null;
  }
  if (isPreviewing) {
    return (
      <SharePreview
        confirmation={{
          isBusy,
          label: "Share and add",
          onCancel: () => setIsPreviewing(false),
          onConfirm: () => attach(suggestion, true),
        }}
        detail={context.detail}
        extracts={proposal}
      />
    );
  }
  return (
    <SuggestionChoices
      canEdit={context.canEdit}
      handlers={{
        isBusy,
        onAdd: () =>
          suggestion.needsShareConsent
            ? setIsPreviewing(true)
            : attach(suggestion, false),
        onKeepSeparate: keepSeparate,
      }}
      suggestion={suggestion}
    />
  );
}

export function AttachedIntentionRow({
  attachment,
  context,
}: {
  attachment: NonNullable<SessionProposal["attachment"]>;
  context: ProposalContext;
}) {
  const { api } = useSessionWorkspace();
  const run = useSessionAction();
  const undo = async () => {
    const detached = await run("The session was not separated", () =>
      api.detachContribution(attachment.contributionId)
    );
    if (detached) {
      announce(`Separated from ${quotedNeed(attachment.need)}`);
      context.review.reload();
    }
  };
  return (
    <article className="dt-card dt-ses-attached">
      <p className="dt-meta">Added to intention “{attachment.need}”</p>
      {context.canEdit && (
        <button className="dt-btn" onClick={undo} type="button">
          Undo
        </button>
      )}
    </article>
  );
}
