import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { type SessionApi, SessionApiError } from "../../../api/session-api";
import type { SessionContribution } from "../../../intention-protocol";
import type { SessionDetail } from "../../../protocol";
import {
  aContinuation,
  aContinuedIntention,
  aContribution,
  anIntentionChange,
} from "../../testing/intention-fixtures";
import {
  aDetail,
  aProposal,
  type FakeRecorder,
  fakeApi,
  fakeRecorder,
  fakeWorkspace,
  renderInWorkspace,
  reviewLinks,
} from "../../testing/session-fixtures";
import { SessionReview } from "../session-review";

vi.mock("../../../local/local-sessions", () => ({
  purgeAccount: vi.fn(),
  useSyncStatus: () => ({
    blockedBy: null,
    isOnline: true,
    lastError: null,
    pendingBytes: 0,
    pendingOperations: 0,
  }),
}));

afterEach(cleanup);

const NEED = "Make the Save button visible on small screens";

async function renderReview(
  detail: SessionDetail,
  parts: { api?: SessionApi; recorder?: FakeRecorder } = {}
) {
  const api = parts.api ?? fakeApi();
  api.detail = vi.fn().mockResolvedValue(detail);
  const links = reviewLinks();
  renderInWorkspace(
    <SessionReview isBriefOpen={false} links={links} sessionId="session_1" />,
    fakeWorkspace({ api, recorder: parts.recorder })
  );
  await screen.findByRole("heading", { name: detail.session.title });
  return { api, links };
}

function continuing(contribution: Partial<SessionContribution> = {}) {
  return aDetail({
    continuation: aContinuation({ contribution: aContribution(contribution) }),
    proposals: [],
  });
}

function updated(contribution: Partial<SessionContribution>) {
  return {
    contribution: aContribution(contribution),
    intention: aContinuedIntention({ revision: 4 }),
  };
}

it("starts a session that continues the intention it was opened from", async () => {
  const recorder = fakeRecorder();
  recorder.start = vi.fn(async () => {
    recorder.emit({ phase: "recording", sessionKey: "key_2" });
  });
  const { links } = await renderReview(
    aDetail({
      proposals: [
        aProposal({
          decision: "kept",
          response: "Pin the action bar",
          unknowns: ["Tablets too?"],
        }),
      ],
    }),
    { recorder }
  );

  fireEvent.click(
    screen.getByRole("button", { name: "Continue this intention" })
  );
  const recap = within(
    screen.getByRole("region", { name: "Continue this intention" })
  );
  expect(recap.getByText("Tablets too?")).toBeTruthy();
  expect(recap.getByText("Pin the action bar")).toBeTruthy();
  expect(recap.getByText(/Nothing is sent to an agent/)).toBeTruthy();
  expect(recorder.start).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Start session" }));

  await waitFor(() => expect(links.onStarted).toHaveBeenCalledTimes(1));
  expect(recorder.start).toHaveBeenCalledWith({
    continues: { intentionId: "proposal_1", revision: 3 },
    title: `Continue: ${NEED}`,
  });
});

function analyzed(
  detail: SessionDetail,
  analysis: Partial<SessionDetail["session"]["analysis"]>
): SessionDetail {
  const { session } = detail;
  return {
    ...detail,
    session: { ...session, analysis: { ...session.analysis, ...analysis } },
  };
}

it("links back to the intention a session continues", async () => {
  const { links } = await renderReview(
    analyzed(continuing({ state: "analyzing" }), { state: "running" })
  );

  expect(screen.getByText(`Continues “${NEED}”`)).toBeTruthy();
  expect(screen.getByText("Comparing with revision 3…")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Open the intention" }));
  expect(links.onOpenSession).toHaveBeenCalledWith("session_home");
});

it("shows why the comparison failed once and compares again on retry", async () => {
  const failed = analyzed(continuing({ changes: [], state: "failed" }), {
    error: "The AI service did not answer.",
    state: "failed",
  });
  const api = fakeApi({
    analyze: vi.fn().mockResolvedValue({
      ...failed.session.analysis,
      error: null,
      state: "running",
    }),
  });
  await renderReview(failed, { api });

  expect(
    screen.getByText("The comparison failed: The AI service did not answer.")
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));

  await waitFor(() => expect(api.analyze).toHaveBeenCalledWith("session_1"));
  expect(await screen.findByText("Comparing with revision 3…")).toBeTruthy();
  expect(screen.queryByText(/The comparison failed/)).toBeNull();
});

it("accepts a change against the intention revision it was compared with", async () => {
  const api = fakeApi({
    acceptIntentionChanges: vi
      .fn()
      .mockResolvedValue(
        updated({ changes: [anIntentionChange({ decision: "accepted" })] })
      ),
  });
  await renderReview(continuing(), { api });

  expect(screen.getByText("Precision")).toBeTruthy();
  expect(screen.getByText(NEED)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Accept" }));

  await waitFor(() =>
    expect(api.acceptIntentionChanges).toHaveBeenCalledWith({
      changes: [{ changeId: "change_1" }],
      contributionId: "contribution_1",
      expectedRevision: 3,
    })
  );
  expect(await screen.findByText("Accepted")).toBeTruthy();
});

it("accepts my own wording of a change", async () => {
  const api = fakeApi({
    acceptIntentionChanges: vi
      .fn()
      .mockResolvedValue(
        updated({ changes: [anIntentionChange({ decision: "accepted" })] })
      ),
  });
  await renderReview(continuing(), { api });

  fireEvent.click(screen.getByRole("button", { name: "Edit then accept" }));
  fireEvent.change(
    screen.getByRole("textbox", { name: "Need (your version)" }),
    { target: { value: "Keep Save in reach on phones" } }
  );
  fireEvent.click(screen.getByRole("button", { name: "Accept edited" }));

  await waitFor(() =>
    expect(api.acceptIntentionChanges).toHaveBeenCalledWith(
      expect.objectContaining({
        changes: [
          { changeId: "change_1", value: "Keep Save in reach on phones" },
        ],
      })
    )
  );
});

it("rejects a change and takes the rejection back", async () => {
  const api = fakeApi({
    reopenOrRejectChange: vi
      .fn()
      .mockResolvedValueOnce(
        updated({ changes: [anIntentionChange({ decision: "rejected" })] })
      )
      .mockResolvedValueOnce(updated({})),
  });
  await renderReview(continuing(), { api });

  fireEvent.click(screen.getByRole("button", { name: "Reject" }));
  expect(await screen.findByText("Rejected")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));

  expect(await screen.findByRole("button", { name: "Accept" })).toBeTruthy();
  expect(api.reopenOrRejectChange).toHaveBeenNthCalledWith(1, {
    changeId: "change_1",
    contributionId: "contribution_1",
    decision: "rejected",
  });
  expect(api.reopenOrRejectChange).toHaveBeenNthCalledWith(2, {
    changeId: "change_1",
    contributionId: "contribution_1",
    decision: "pending",
  });
});

it("shows what the team will see before accepting from a private session", async () => {
  const api = fakeApi({
    acceptIntentionChanges: vi
      .fn()
      .mockResolvedValue(
        updated({ changes: [anIntentionChange({ decision: "accepted" })] })
      ),
  });
  await renderReview(continuing({ needsShareConsent: true }), { api });

  fireEvent.click(screen.getByRole("button", { name: "Accept" }));
  expect(screen.getByText(/become visible to your team/)).toBeTruthy();
  expect(
    screen.getAllByText(/I can never find the save button here/).length
  ).toBeGreaterThan(1);
  expect(api.acceptIntentionChanges).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Share and accept" }));

  await waitFor(() =>
    expect(api.acceptIntentionChanges).toHaveBeenCalledWith(
      expect.objectContaining({ shareWithTeam: true })
    )
  );
});

it("asks to reload when the intention changed before accepting", async () => {
  const api = fakeApi({
    acceptIntentionChanges: vi
      .fn()
      .mockRejectedValue(
        new SessionApiError("Stale", { limit: null, status: 409 })
      ),
  });
  await renderReview(continuing({ stale: true }), { api });

  expect(
    screen.getByText(/The intention changed since this comparison/)
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Accept" }));
  expect(
    await screen.findByText(
      "Someone changed this since you opened it. Reload it, then edit again."
    )
  ).toBeTruthy();
});

it("records the author's check on the intention and shows it after reload", async () => {
  const verdict = {
    reason: "The author saw the button on a phone.",
    segmentIds: [],
    status: "resolved" as const,
  };
  const checked = aDetail({
    continuation: aContinuation({
      contribution: aContribution({ verdict }),
      intention: aContinuedIntention({
        verification: { at: 0, sessionId: "session_1", status: "works" },
      }),
    }),
    proposals: [],
  });
  const api = fakeApi({
    verifyProposal: vi.fn().mockResolvedValue(aProposal()),
  });
  await renderReview(continuing({ verdict }), { api });
  api.detail = vi.fn().mockResolvedValue(checked);

  fireEvent.click(screen.getByRole("button", { name: "Confirm: works" }));

  expect(await screen.findByText(/You confirmed it works on/)).toBeTruthy();
  expect(api.verifyProposal).toHaveBeenCalledWith({
    note: verdict.reason,
    proposalId: "intention_1",
    sessionId: "session_1",
    status: "works",
  });
});
