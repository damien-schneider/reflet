import { announce } from "../../../../devtools/client/notices";
import type { IntentionUpdate } from "../../../api/session-api";
import type { SessionContinuation } from "../../../intention-protocol";
import type { SessionDetail } from "../../../protocol";
import { useSessionAction, useSessionWorkspace } from "../../session-workspace";
import type { ProposalContext } from "../proposals/proposal-details";

export interface AcceptRequest {
  changeId: string;
  shareWithTeam: boolean;
  value: string | null;
}

export interface UpdateActions {
  accept: (request: AcceptRequest) => Promise<void>;
  answer: (text: string) => Promise<boolean>;
  decide: (changeId: string, decision: "pending" | "rejected") => void;
  detach: () => void;
  verify: (status: "works" | "needs_work", note: string) => void;
}

function withUpdate(
  detail: SessionDetail,
  update: IntentionUpdate
): SessionDetail {
  return {
    ...detail,
    continuation: {
      contribution: update.contribution,
      intention: update.intention,
    },
  };
}

interface UpdateScope {
  context: ProposalContext;
  continuation: SessionContinuation;
}

function useChangeDecisions({
  context,
  continuation,
}: UpdateScope): Pick<UpdateActions, "accept" | "decide"> {
  const { api } = useSessionWorkspace();
  const run = useSessionAction();
  const { contribution, intention } = continuation;
  const apply = (update: IntentionUpdate) =>
    context.review.patch((detail) => withUpdate(detail, update));

  return {
    accept: async ({ changeId, shareWithTeam, value }) => {
      const update = await api.acceptIntentionChanges({
        changes: [value === null ? { changeId } : { changeId, value }],
        contributionId: contribution.id,
        expectedRevision: intention?.revision ?? contribution.baseRevision,
        ...(shareWithTeam ? { shareWithTeam } : {}),
      });
      apply(update);
      announce("Change accepted into the intention");
    },
    decide: async (changeId, decision) => {
      const update = await run("The change was not updated", () =>
        api.reopenOrRejectChange({
          changeId,
          contributionId: contribution.id,
          decision,
        })
      );
      if (update) {
        apply(update);
      }
    },
  };
}

function useReloadingAction(context: ProposalContext) {
  const run = useSessionAction();
  return async <T>(failureLabel: string, action: () => Promise<T>) => {
    const result = await run(failureLabel, action);
    if (result === null) {
      return false;
    }
    context.review.reload();
    return true;
  };
}

function useContributionActions({
  context,
  continuation,
}: UpdateScope): Omit<UpdateActions, "accept" | "decide"> {
  const { api } = useSessionWorkspace();
  const runThenReload = useReloadingAction(context);
  const contributionId = continuation.contribution.id;
  const intentionId = continuation.intention?.id;
  const sessionId = context.detail.session.id;

  return {
    answer: (text) =>
      runThenReload("The answer was not sent", () =>
        api.answerIntentionQuestion({ contributionId, text })
      ),
    detach: async () => {
      if (
        await runThenReload("The contribution was not removed", () =>
          api.detachContribution(contributionId)
        )
      ) {
        announce("This session's contribution was removed");
      }
    },
    verify: async (status, note) => {
      if (
        intentionId &&
        (await runThenReload("The check was not saved", () =>
          api.verifyProposal({
            note,
            proposalId: intentionId,
            sessionId,
            status,
          })
        ))
      ) {
        announce("Check saved on the intention");
      }
    },
  };
}

export function useUpdateActions(scope: UpdateScope): UpdateActions {
  return { ...useChangeDecisions(scope), ...useContributionActions(scope) };
}
