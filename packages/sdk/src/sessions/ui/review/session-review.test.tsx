import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useSyncExternalStore } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { SessionApiError } from "../../api/session-api";
import type { SessionDetail } from "../../protocol";
import {
  aDetail,
  anEvidence,
  aProposal,
  aSegment,
  aSummary,
  fakeApi,
  fakeWorkspace,
  renderInWorkspace,
  reviewLinks,
} from "../testing/session-fixtures";
import { SessionReview } from "./session-review";

const uploads = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  let pending = 0;
  return {
    get: () => pending,
    set: (next: number) => {
      pending = next;
      for (const listener of listeners) {
        listener();
      }
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
});

vi.mock("../../local/local-sessions", () => ({
  purgeAccount: vi.fn(),
  useSyncStatus: () => ({
    blockedBy: null,
    isOnline: true,
    lastError: null,
    pendingBytes: 0,
    pendingOperations: useSyncExternalStore(uploads.subscribe, uploads.get),
  }),
}));

afterEach(() => {
  cleanup();
  uploads.set(0);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function renderReview(
  detail: SessionDetail = aDetail(),
  api = fakeApi()
) {
  api.detail = vi.fn().mockResolvedValue(detail);
  renderInWorkspace(
    <SessionReview
      isBriefOpen={false}
      links={reviewLinks()}
      sessionId="session_1"
    />,
    fakeWorkspace({ api })
  );
  await screen.findByRole("heading", { name: detail.session.title });
  return api;
}

const NEED = "Make the Save button visible on small screens";

it("opens on the intentions", async () => {
  await renderReview();
  expect(
    screen
      .getByRole("tab", { name: /^Intentions/ })
      .getAttribute("aria-selected")
  ).toBe("true");
  expect(screen.getByText(NEED)).toBeTruthy();
});

it("shows what finished uploading after the analysis without a reload", async () => {
  uploads.set(1);
  const api = await renderReview(aDetail({ evidence: [] }));
  expect(screen.getByText("Uploading")).toBeTruthy();
  api.detail = vi.fn().mockResolvedValue(aDetail({ evidence: [anEvidence()] }));

  act(() => uploads.set(0));

  expect(
    await screen.findByRole("tab", { name: /^Screenshots\s*1$/ })
  ).toBeTruthy();
  expect(screen.queryByRole("list", { name: "Processing" })).toBeNull();
});

function processingRows() {
  const steps = screen.getByRole("list", { name: "Processing" });
  return within(steps)
    .getAllByRole("listitem")
    .map((row) => [row.textContent, row.dataset.state]);
}

it("shows which step the session is at while the AI waits for the transcript", async () => {
  const session = aSummary({
    analysis: { ...aSummary().analysis, state: "waiting" },
  });
  await renderReview(
    aDetail({
      proposals: [],
      segments: [
        aSegment(),
        aSegment({
          id: "segment_2",
          transcription: { attempts: 1, error: null, state: "running" },
        }),
      ],
      session: { ...session, canEdit: true, gaps: [], startUrl: null },
    })
  );

  expect(processingRows()).toEqual([
    ["Uploaded", "done"],
    ["Transcribing your voice", "active"],
    ["Find intentions with AI", "waiting"],
  ]);
  expect(
    screen
      .getByRole("progressbar", { name: "Transcribing your voice" })
      .getAttribute("aria-valuetext")
  ).toBe("1 of 2 passages");
});

it("does not offer to analyze a finished session whose analysis is still queued for upload", async () => {
  uploads.set(2);
  const session = aSummary({
    analysis: { ...aSummary().analysis, analyzedRevision: null, state: "idle" },
  });
  await renderReview(
    aDetail({
      proposals: [],
      segments: [],
      session: { ...session, canEdit: true, gaps: [], startUrl: null },
    })
  );

  expect(processingRows()).toEqual([
    ["Uploading", "active"],
    ["Transcribe your voice", "waiting"],
    ["Find intentions with AI", "waiting"],
  ]);
  expect(screen.queryByRole("button", { name: "Analyze" })).toBeNull();
});

it("confirms an intention and undoes it back to its previous decision", async () => {
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

  fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
  const notice = await screen.findByText(`Confirmed “${NEED}”`);
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

it("shows a decision at once and puts it back with a retry when it was not saved", async () => {
  let refuse: (error: Error) => void = () => undefined;
  const api = fakeApi({
    decideProposal: vi
      .fn()
      .mockReturnValueOnce(
        new Promise((_resolve, reject) => {
          refuse = reject;
        })
      )
      .mockResolvedValueOnce(aProposal({ decision: "kept" })),
  });
  await renderReview(
    aDetail({ proposals: [aProposal({ decision: "later" })] }),
    api
  );
  const confirm = screen.getByRole("button", { name: "Confirm" });

  fireEvent.click(confirm);
  expect(confirm.getAttribute("aria-pressed")).toBe("true");

  await act(async () => refuse(new Error("Offline")));
  expect(confirm.getAttribute("aria-pressed")).toBe("false");
  const failure = screen.getByText("The decision was not saved: Offline");
  fireEvent.click(
    within(failure.parentElement ?? document.body).getByRole("button", {
      name: "Retry",
    })
  );
  await waitFor(() =>
    expect(confirm.getAttribute("aria-pressed")).toBe("true")
  );
  expect(api.decideProposal).toHaveBeenCalledTimes(2);
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
  fireEvent.click(screen.getByRole("button", { name: "Update intention" }));
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

it("offers to retry a failed analysis instead of claiming there were no intentions", async () => {
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

it("says the analysis found nothing once every step is done", async () => {
  await renderReview(aDetail({ proposals: [] }));

  expect(
    screen.getByText("No request stood out in this session.")
  ).toBeTruthy();
  expect(screen.queryByRole("list", { name: "Processing" })).toBeNull();
});

it("confirms every undecided intention at once and undoes them together", async () => {
  const api = fakeApi({
    decideProposal: vi.fn(
      ({ decision, proposalId }: { decision: string; proposalId: string }) =>
        Promise.resolve(
          aProposal({
            decision: decision === "kept" ? "kept" : "pending",
            id: proposalId,
          })
        )
    ),
  });
  await renderReview(
    aDetail({
      proposals: [
        aProposal(),
        aProposal({ id: "proposal_2", need: "Rename menu" }),
        aProposal({ decision: "dismissed", id: "proposal_3", need: "Noise" }),
      ],
    }),
    api
  );

  fireEvent.click(screen.getByRole("button", { name: /^Confirm all\s*2$/ }));

  const notice = await screen.findByText("Confirmed 2 intentions");
  expect(api.decideProposal).toHaveBeenCalledTimes(2);
  expect(api.decideProposal).not.toHaveBeenCalledWith(
    expect.objectContaining({ proposalId: "proposal_3" })
  );
  expect(screen.queryByRole("button", { name: /^Confirm all/ })).toBeNull();
  fireEvent.click(
    within(notice.parentElement ?? document.body).getByRole("button", {
      name: "Undo",
    })
  );
  await waitFor(() => expect(api.decideProposal).toHaveBeenCalledTimes(4));
  expect(api.decideProposal).toHaveBeenLastCalledWith(
    expect.objectContaining({ decision: "pending" })
  );
});

it("shows intentions being found while the session is still recording", async () => {
  await renderReview(
    aDetail({
      marks: [],
      proposals: [],
      segments: [],
      session: {
        ...aDetail().session,
        analysis: { ...aDetail().session.analysis, state: "running" },
        collection: "recording",
      },
    })
  );

  expect(screen.getByText("Finding intentions with AI…")).toBeTruthy();
  expect(screen.queryByText(/Nothing was said/)).toBeNull();
});

it("warns what goes with a session before deleting it", async () => {
  const api = fakeApi({ deleteSession: vi.fn().mockResolvedValue(undefined) });
  await renderReview(aDetail(), api);

  fireEvent.click(screen.getByRole("button", { name: "Session options" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Delete session" }));
  expect(
    screen.getByText(
      "Delete this session? Its recording, transcript, screenshots and intentions go, along with what later sessions added to those intentions."
    )
  ).toBeTruthy();
  expect(api.deleteSession).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  await waitFor(() =>
    expect(api.deleteSession).toHaveBeenCalledWith("session_1")
  );
});

it("adds the confirmed intentions that are not on the board yet", async () => {
  const api = fakeApi({
    createFeedback: vi.fn((proposalId: string) =>
      Promise.resolve({ created: true, feedbackId: `feedback_${proposalId}` })
    ),
  });
  await renderReview(
    aDetail({
      proposals: [
        aProposal({ decision: "kept" }),
        aProposal({ decision: "kept", id: "proposal_2", need: "Rename menu" }),
        aProposal({
          decision: "kept",
          feedbackId: "feedback_old",
          id: "proposal_3",
          need: "Already on the board",
        }),
        aProposal({ decision: "pending", id: "proposal_4", need: "Pending" }),
      ],
    }),
    api
  );

  fireEvent.click(screen.getByRole("button", { name: /^Add to board\s*2$/ }));

  expect(
    await screen.findByText("Added 2 intentions to the board")
  ).toBeTruthy();
  expect(api.createFeedback).toHaveBeenCalledTimes(2);
  expect(api.createFeedback).toHaveBeenCalledWith("proposal_1");
  expect(api.createFeedback).toHaveBeenCalledWith("proposal_2");
  await waitFor(() =>
    expect(footerButton("Add to board")).toHaveProperty(
      "title",
      "Every confirmed intention is on the board"
    )
  );
});

it("keeps a session recorded under another app's account off the board", async () => {
  const detail = aDetail({ proposals: [aProposal({ decision: "kept" })] });
  renderInWorkspace(
    <SessionReview
      isBriefOpen={false}
      links={reviewLinks()}
      sessionId="session_1"
    />,
    fakeWorkspace({
      api: fakeApi({ detail: vi.fn().mockResolvedValue(detail) }),
      canAddToBoard: false,
    })
  );
  await screen.findByRole("heading", { name: detail.session.title });

  const [onlyAddButton, ...others] = screen.getAllByRole("button", {
    name: "Add to board",
  });
  expect(others).toEqual([]);
  expect(onlyAddButton).toHaveProperty("disabled", true);
  expect(onlyAddButton).toBe(footerButton("Add to board"));
});

it("opens the brief from the confirmed intentions", async () => {
  const api = fakeApi({
    detail: vi
      .fn()
      .mockResolvedValue(
        aDetail({ proposals: [aProposal({ decision: "kept" })] })
      ),
  });
  const links = reviewLinks();
  renderInWorkspace(
    <SessionReview isBriefOpen={false} links={links} sessionId="session_1" />,
    fakeWorkspace({ api })
  );

  fireEvent.click(
    await screen.findByRole("button", { name: /^Prepare brief\s*1$/ })
  );

  expect(links.onOpenBrief).toHaveBeenCalled();
});

function footerButton(name: string) {
  const footer = screen.getByRole("button", { name: /^Prepare brief/ });
  return within(footer.parentElement ?? document.body).getByRole("button", {
    name,
  });
}

it("explains why briefing waits for a confirmed intention", async () => {
  await renderReview();

  for (const name of ["Prepare brief", "Add to board"]) {
    const button = footerButton(name);
    expect(button).toHaveProperty("disabled", true);
    expect(button).toHaveProperty("title", "Confirm an intention first");
  }
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
  const STEP_MS = 250;
  const WATCHED_MS = 12_000;
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
    <SessionReview
      isBriefOpen={false}
      links={reviewLinks()}
      sessionId="session_1"
    />,
    fakeWorkspace({ api })
  );

  for (let elapsed = 0; elapsed < WATCHED_MS; elapsed += STEP_MS) {
    await act(() => vi.advanceTimersByTimeAsync(STEP_MS));
  }

  expect(screen.getByText(NEED)).toBeTruthy();
  expect(api.detail).toHaveBeenCalledTimes(2);
});
