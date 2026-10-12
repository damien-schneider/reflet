import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SessionApiError } from "../../api/session-api";
import type { SessionDetail } from "../../protocol";
import {
  aDetail,
  aProposal,
  aSummary,
  fakeApi,
  fakeWorkspace,
  renderInWorkspace,
} from "../testing/session-fixtures";
import { SessionReview } from "./session-review";

vi.mock("../../local/local-sessions", () => ({
  purgeAccount: vi.fn(),
  useSyncStatus: () => ({
    blockedBy: null,
    isOnline: true,
    lastError: null,
    pendingBytes: 0,
    pendingOperations: 0,
  }),
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function renderReview(
  detail: SessionDetail = aDetail(),
  api = fakeApi()
) {
  api.detail = vi.fn().mockResolvedValue(detail);
  renderInWorkspace(
    <SessionReview onBack={vi.fn()} sessionId="session_1" />,
    fakeWorkspace({ api })
  );
  await screen.findByRole("heading", { name: detail.session.title });
  return api;
}

const NEED = "Make the Save button visible on small screens";

it("opens on the proposals", async () => {
  await renderReview();
  expect(
    screen
      .getByRole("button", { name: "Proposals (1)" })
      .getAttribute("aria-pressed")
  ).toBe("true");
  expect(screen.getByText(NEED)).toBeTruthy();
});

it("keeps a proposal and undoes it back to its previous decision", async () => {
  const api = fakeApi({
    decideProposal: vi
      .fn()
      .mockResolvedValueOnce(aProposal({ decision: "kept" }))
      .mockResolvedValueOnce(aProposal({ decision: "later" })),
  });
  await renderReview(
    aDetail({ proposals: [aProposal({ decision: "later" })] }),
    api
  );

  fireEvent.click(screen.getByRole("button", { name: "Keep" }));
  const notice = await screen.findByText(`Kept “${NEED}”`);
  fireEvent.click(
    within(notice.parentElement ?? document.body).getByRole("button", {
      name: "Undo",
    })
  );
  await waitFor(() =>
    expect(api.decideProposal).toHaveBeenLastCalledWith({
      decision: "later",
      proposalId: "proposal_1",
    })
  );
});

it("saves an edit against the revision it was made on and explains a conflict", async () => {
  const api = fakeApi({
    editProposal: vi
      .fn()
      .mockRejectedValue(
        new SessionApiError("Stale revision", { limit: null, status: 409 })
      ),
  });
  await renderReview(aDetail(), api);

  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Need" }), {
    target: { value: "Keep Save visible" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() =>
    expect(api.editProposal).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedRevision: 3,
        need: "Keep Save visible",
        proposalId: "proposal_1",
      })
    )
  );
  expect(
    await screen.findByText(
      "Someone changed this since you opened it. Reload it, then edit again."
    )
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Reload" }));
  await waitFor(() => expect(api.detail).toHaveBeenCalledTimes(2));
});

it("sends a clarification as text", async () => {
  const api = fakeApi({
    clarifyProposal: vi
      .fn()
      .mockResolvedValue(
        aProposal({ refinement: { error: null, state: "running" } })
      ),
  });
  await renderReview(aDetail(), api);

  fireEvent.click(screen.getByRole("button", { name: "Show details" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Add a precision…" }), {
    target: { value: "Only on the checkout page" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Update proposal" }));
  await waitFor(() =>
    expect(api.clarifyProposal).toHaveBeenCalledWith({
      expectedRevision: 3,
      proposalId: "proposal_1",
      text: "Only on the checkout page",
    })
  );
  expect(await screen.findByText("Refining…")).toBeTruthy();
});

it("merges suggested duplicates only when asked", async () => {
  const api = fakeApi({
    mergeProposals: vi.fn().mockResolvedValue(aProposal({ revision: 4 })),
  });
  await renderReview(
    aDetail({
      proposals: [
        aProposal({
          mergeSuggestion: { reason: "Same button", withIds: ["proposal_2"] },
        }),
        aProposal({ id: "proposal_2", need: "Show Save on mobile" }),
      ],
    }),
    api
  );

  expect(
    screen.getByText("Looks like the same need as “Show Save on mobile”.")
  ).toBeTruthy();
  expect(api.mergeProposals).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Merge" }));
  await waitFor(() =>
    expect(api.mergeProposals).toHaveBeenCalledWith({
      sourceIds: ["proposal_2"],
      targetId: "proposal_1",
    })
  );
});

it("offers to retry a failed analysis instead of claiming there were no proposals", async () => {
  const session = aSummary({
    analysis: {
      ...aSummary().analysis,
      error: "The model timed out.",
      state: "failed",
    },
  });
  const api = fakeApi({ analyze: vi.fn().mockResolvedValue(session.analysis) });
  await renderReview(
    aDetail({
      proposals: [],
      session: { ...session, canEdit: true, gaps: [], startUrl: null },
    }),
    api
  );

  expect(
    screen.getByText("Analysis failed: The model timed out.")
  ).toBeTruthy();
  expect(screen.queryByText(/No request stood out/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await waitFor(() => expect(api.analyze).toHaveBeenCalledWith("session_1"));
});

it("explains an analysis that found nothing and lets me write the proposal", async () => {
  const api = fakeApi({
    createProposal: vi.fn().mockResolvedValue(aProposal({ origin: "human" })),
  });
  await renderReview(aDetail({ proposals: [] }), api);

  expect(
    screen.getByText(
      "No request stood out in this session. Read the transcript or write the proposal yourself."
    )
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Add a proposal" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Need" }), {
    target: { value: "Explain the pricing tiers" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add proposal" }));
  await waitFor(() =>
    expect(api.createProposal).toHaveBeenCalledWith(
      expect.objectContaining({
        need: "Explain the pricing tiers",
        sessionId: "session_1",
      })
    )
  );
});

it("does not call a session empty while its recording is still uploading", async () => {
  await renderReview(
    aDetail({
      marks: [],
      proposals: [],
      segments: [],
      session: {
        ...aDetail().session,
        analysis: { ...aDetail().session.analysis, state: "idle" },
        collection: "recording",
      },
    })
  );

  expect(
    screen.getByText(
      "Proposals appear here once the recording has uploaded and Reflet has read it."
    )
  ).toBeTruthy();
  expect(screen.queryByText(/Nothing was said/)).toBeNull();
});

it("warns that exported briefs stay out there before deleting", async () => {
  const api = fakeApi({ deleteSession: vi.fn().mockResolvedValue(undefined) });
  await renderReview(aDetail(), api);

  fireEvent.click(screen.getByRole("button", { name: "Session options" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete session" }));
  expect(
    screen.getByText(
      "Delete this session? Its recordings, transcript and proposals are removed. Briefs you already copied or exported can't be recalled."
    )
  ).toBeTruthy();
  expect(api.deleteSession).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  await waitFor(() =>
    expect(api.deleteSession).toHaveBeenCalledWith("session_1")
  );
});

it("shows the finished analysis even when each refresh takes longer than the poll interval", async () => {
  vi.useFakeTimers();
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  const analyzing = aDetail({
    proposals: [],
    session: {
      ...aDetail().session,
      analysis: { ...aDetail().session.analysis, state: "running" },
    },
  });
  const SLOW_ANSWER_MS = 3000;
  const POLL_WAIT_MS = 2000;
  const answers = [analyzing, aDetail()];
  const api = fakeApi({
    detail: vi.fn(() => {
      const answer = answers.length > 1 ? answers.shift() : answers[0];
      return new Promise<SessionDetail>((resolve) =>
        setTimeout(() => resolve(answer ?? aDetail()), SLOW_ANSWER_MS)
      );
    }),
  });
  renderInWorkspace(
    <SessionReview onBack={vi.fn()} sessionId="session_1" />,
    fakeWorkspace({ api })
  );

  for (const step of [SLOW_ANSWER_MS, POLL_WAIT_MS, SLOW_ANSWER_MS]) {
    await act(() => vi.advanceTimersByTimeAsync(step));
  }

  expect(screen.getByText(NEED)).toBeTruthy();
  expect(api.detail).toHaveBeenCalledTimes(2);
});
