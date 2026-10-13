import { announce } from "../../../../devtools/client/notices";
import type { SessionApi } from "../../../api/session-api";
import type { ProposalDecision, SessionProposal } from "../../../protocol";
import { useSessionAction, useSessionWorkspace } from "../../session-workspace";
import { type ReviewHandle, withProposal } from "../use-session-detail";

const NOTICE_NEED_LENGTH = 60;

const DECISION_NOTICE: Record<ProposalDecision, string> = {
  dismissed: "Dismissed",
  kept: "Confirmed",
  later: "Saved for later",
  pending: "Back to undecided",
};

export interface ProposalActions {
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

function decideWithUndo(
  save: ProposalActions["save"]
): ProposalActions["decide"] {
  const restore = async (proposalId: string, decision: ProposalDecision) => {
    const restored = await save("The decision was not undone", (client) =>
      client.decideProposal({ decision, proposalId })
    );
    if (restored) {
      announce("Decision undone");
    }
  };

  return async (proposal, decision) => {
    const previous = proposal.decision;
    const updated = await save("The decision was not saved", (client) =>
      client.decideProposal({ decision, proposalId: proposal.id })
    );
    if (updated) {
      announce(`${DECISION_NOTICE[decision]} ${quotedNeed(proposal.need)}`, {
        label: "Undo",
        run: () => restore(proposal.id, previous),
      });
    }
  };
}

export function useProposalActions(review: ReviewHandle): ProposalActions {
  const save = useProposalSave(review);

  return {
    clarify: (proposal, text) =>
      save("The precision was not sent", (client) =>
        client.clarifyProposal({
          expectedRevision: proposal.revision,
          proposalId: proposal.id,
          text,
        })
      ),
    decide: decideWithUndo(save),
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
