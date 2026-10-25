import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { SessionApi } from "../../api/session-api";
import type { SessionDetail } from "../../protocol";
import { aHistoryEntry } from "../testing/intention-fixtures";
import {
  aDetail,
  aProposal,
  fakeApi,
  fakeWorkspace,
  renderInWorkspace,
  reviewLinks,
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

afterEach(cleanup);

async function renderReview(
  detail: SessionDetail,
  api: SessionApi = fakeApi()
) {
  api.detail = vi.fn().mockResolvedValue(detail);
  const links = reviewLinks();
  renderInWorkspace(
    <SessionReview isBriefOpen={false} links={links} sessionId="session_1" />,
    fakeWorkspace({ api })
  );
  await screen.findByRole("heading", { name: detail.session.title });
  return { api, links };
}

const SUGGESTION = {
  intentionId: "intention_9",
  need: "Show prices with taxes",
  needsShareConsent: true,
  reason: "Same checkout total",
  sessionId: "session_9",
  sessionTitle: "Pricing review",
};

it("keeps another author's extracts private in the history", async () => {
  const { links } = await renderReview(
    aDetail({
      history: [
        aHistoryEntry({
          extractsHidden: true,
          id: "contribution_hidden",
          quotes: [],
          session: {
            canOpen: false,
            id: "session_3",
            startedAt: 1_700_000_600_000,
            title: "Grace's check",
          },
        }),
        aHistoryEntry(),
      ],
    })
  );

  fireEvent.click(screen.getByRole("button", { name: "Show details" }));
  expect(screen.getByText(/Continued in “Grace's check”/)).toBeTruthy();
  expect(screen.getByText("Extracts are private to the author")).toBeTruthy();
  expect(screen.getByText(/Only on my phone it hides/)).toBeTruthy();
  expect(
    screen.getAllByRole("button", { description: "Open session" })
  ).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { description: "Open session" }));
  expect(links.onOpenSession).toHaveBeenCalledWith("session_2");
});

it("shows what becomes visible to the team before adding to another intention", async () => {
  const api = fakeApi({
    attachToIntention: vi.fn().mockResolvedValue(
      aProposal({
        attachment: {
          contributionId: "contribution_2",
          intentionId: "intention_9",
          need: SUGGESTION.need,
        },
      })
    ),
    detachContribution: vi.fn().mockResolvedValue({}),
  });
  await renderReview(
    aDetail({ proposals: [aProposal({ intentionSuggestion: SUGGESTION })] }),
    api
  );

  expect(
    screen.getByText(
      "Might belong to “Show prices with taxes” (from “Pricing review”): Same checkout total"
    )
  ).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Add to this intention" })
  );
  expect(screen.getByText(/become visible to your team/)).toBeTruthy();
  expect(api.attachToIntention).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Share and add" }));

  await waitFor(() =>
    expect(api.attachToIntention).toHaveBeenCalledWith({
      intentionId: "intention_9",
      proposalId: "proposal_1",
      shareWithTeam: true,
    })
  );
  expect(
    await screen.findByText("Added to intention “Show prices with taxes”")
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() =>
    expect(api.detachContribution).toHaveBeenCalledWith("contribution_2")
  );
});

it("adds a considered response without touching the need", async () => {
  const api = fakeApi({
    editProposal: vi
      .fn()
      .mockResolvedValue(aProposal({ response: "Pin the bar", revision: 4 })),
  });
  await renderReview(aDetail(), api);

  fireEvent.click(
    screen.getByRole("button", { name: "Add a considered response" })
  );
  fireEvent.change(
    screen.getByRole("textbox", { name: "Considered response" }),
    { target: { value: "Pin the bar" } }
  );
  fireEvent.click(screen.getByRole("button", { name: "Save response" }));

  await waitFor(() =>
    expect(api.editProposal).toHaveBeenCalledWith({
      expectedRevision: 3,
      proposalId: "proposal_1",
      response: "Pin the bar",
    })
  );
  expect(await screen.findByText("Pin the bar")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Edit response" })).toBeTruthy();
});

it("deletes an intention only after warning about what goes with it", async () => {
  const api = fakeApi({ deleteProposal: vi.fn().mockResolvedValue(undefined) });
  await renderReview(aDetail(), api);

  fireEvent.click(screen.getByRole("button", { name: "Show details" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete intention" }));
  expect(
    screen.getByText(
      "Delete this intention? What later sessions added to it goes too, and so do the briefs Reflet saved that include it. Briefs you already copied or downloaded keep their text."
    )
  ).toBeTruthy();
  expect(api.deleteProposal).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));

  await waitFor(() =>
    expect(api.deleteProposal).toHaveBeenCalledWith("proposal_1")
  );
  expect(
    await screen.findByRole("tab", { name: /^Intentions\s*0$/ })
  ).toBeTruthy();
});
