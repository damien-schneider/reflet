import { announce } from "../../../../devtools/client/notices";
import type { SessionApi } from "../../../api/session-api";
import type {
  ProposalDecision,
  SessionDetail,
  SessionProposal,
} from "../../../protocol";
import { countLabel } from "../../session-format";
import { useSessionAction, useSessionWorkspace } from "../../session-workspace";
import { useOptimisticChange } from "../optimistic-change";
import { type ReviewHandle, withProposal } from "../use-session-detail";

const NOTICE_NEED_LENGTH = 60;

const DECISION_NOTICE: Record<ProposalDecision, string> = {
  dismissed: "Dismissed",
  kept: "Confirmed",
  later: "Saved for later",
  pending: "Back to undecided",
};

export interface ProposalActions {
  addToBoard: (proposals: SessionProposal[]) => Promise<void>;
  clarify: (proposal: SessionProposal, text: string) => Promise<unknown>;
  decide: (proposal: SessionProposal, decision: ProposalDecision) => void;
  merge: (targetId: string, sourceIds: string[]) => void;
  save: (
    failureLabel: string,
    request: (api: SessionApi) => Promise<SessionProposal>
  ) => Promise<SessionProposal | null>;
  separate: (proposalId: string) => void;
  verify: (
    proposalId: string,
    outcome: { note: string; status: "works" | "needs_work" }
  ) => void;
}

export function quotedNeed(need: string): string {
  const short =
    need.length > NOTICE_NEED_LENGTH
      ? `${need.slice(0, NOTICE_NEED_LENGTH - 1)}…`
      : need;
  return `“${short}”`;
}

function useProposalSave(review: ReviewHandle): ProposalActions["save"] {
  const { api } = useSessionWorkspace();
  const run = useSessionAction();
  return async (failureLabel, request) => {
    const proposal = await run(failureLabel, () => request(api));
    if (proposal) {
      review.patch((detail) => withProposal(detail, proposal));
    }
    return proposal;
  };
}

function withDecision(
  proposalId: string,
  decision: ProposalDecision
): (detail: SessionDetail) => SessionDetail {
  return (detail) => ({
    ...detail,
    proposals: detail.proposals.map((item) =>
      item.id === proposalId ? { ...item, decision } : item
    ),
  });
}

function useDecide(review: ReviewHandle): ProposalActions["decide"] {
  const { api } = useSessionWorkspace();
  const applyChange = useOptimisticChange(review);

  const changeDecision = (options: {
    failureLabel: string;
    from: ProposalDecision;
    proposalId: string;
    to: ProposalDecision;
  }) =>
    applyChange({
      failureLabel: options.failureLabel,
      request: () =>
        api.decideProposal({
          decision: options.to,
          proposalId: options.proposalId,
        }),
      rollback: withDecision(options.proposalId, options.from),
      settle: withProposal,
      show: withDecision(options.proposalId, options.to),
    });

  return async (proposal, decision) => {
    const previous = proposal.decision;
    const updated = await changeDecision({
      failureLabel: "The decision was not saved",
      from: previous,
      proposalId: proposal.id,
      to: decision,
    });
    if (!updated) {
      return;
    }
    announce(`${DECISION_NOTICE[decision]} ${quotedNeed(proposal.need)}`, {
      label: "Undo",
      run: async () => {
        const restored = await changeDecision({
          failureLabel: "The decision was not undone",
          from: decision,
          proposalId: proposal.id,
          to: previous,
        });
        if (restored) {
          announce("Decision undone");
        }
      },
    });
  };
}

function withFeedbackIds(
  feedbackIds: ReadonlyMap<string, string>
): (detail: SessionDetail) => SessionDetail {
  return (detail) => ({
    ...detail,
    proposals: detail.proposals.map((item) => {
      const feedbackId = feedbackIds.get(item.id);
      return feedbackId ? { ...item, feedbackId } : item;
    }),
  });
}

function useAddToBoard(review: ReviewHandle): ProposalActions["addToBoard"] {
  const { api } = useSessionWorkspace();
  const run = useSessionAction();
  return async (proposals) => {
    const created = await Promise.all(
      proposals.map(async (proposal) => {
        const result = await run(
          `${quotedNeed(proposal.need)} was not added to the board`,
          () => api.createFeedback(proposal.id)
        );
        return result ? ([proposal.id, result.feedbackId] as const) : null;
      })
    );
    const added = new Map(created.flatMap((entry) => (entry ? [entry] : [])));
    if (added.size === 0) {
      return;
    }
    review.patch(withFeedbackIds(added));
    const onlyAdded =
      added.size === 1
        ? proposals.find((proposal) => added.has(proposal.id))
        : undefined;
    announce(
      onlyAdded
        ? `Added ${quotedNeed(onlyAdded.need)} to the board`
        : `Added ${countLabel(added.size, "intention")} to the board`
    );
  };
}

export function useProposalActions(review: ReviewHandle): ProposalActions {
  const save = useProposalSave(review);
  const decide = useDecide(review);
  const addToBoard = useAddToBoard(review);

  return {
    addToBoard,
    clarify: (proposal, text) =>
      save("The precision was not sent", (client) =>
        client.clarifyProposal({
          expectedRevision: proposal.revision,
          proposalId: proposal.id,
          text,
        })
      ),
    decide,
    merge: async (targetId, sourceIds) => {
      const merged = await save("The intentions were not merged", (client) =>
        client.mergeProposals({ sourceIds, targetId })
      );
      if (merged) {
        review.reload();
      }
    },
    save,
    separate: (proposalId) =>
      save("The suggestion was not cleared", (client) =>
        client.separateProposal(proposalId)
      ),
    verify: (proposalId, { note, status }) =>
      save("The check was not saved", (client) =>
        client.verifyProposal({ note: note || undefined, proposalId, status })
      ),
  };
}
