import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { SessionApi } from "../../../api/session-api";
import type { SessionDetail } from "../../../protocol";
import {
  aDetail,
  anEvidence,
  aProposal,
  fakeApi,
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

const FRAME_LABEL = "Frame stops at 1280 px";

const FRAME_PROPOSAL = aProposal({
  callout: FRAME_LABEL,
  calloutTarget: { element: null, evidenceId: "evidence_early" },
  id: "proposal_frame",
  need: "See the whole 1920×1080 canvas in OBS",
});

function twoScreensDetail(): SessionDetail {
  return aDetail({
    evidence: [
      anEvidence({ atMs: 2000, id: "evidence_early" }),
      anEvidence({
        atMs: 9000,
        id: "evidence_late",
        image: { height: 600, url: "https://files.test/late.png", width: 800 },
      }),
    ],
    proposals: [
      FRAME_PROPOSAL,
      aProposal({
        id: "proposal_export",
        need: "Export my settings as a file",
      }),
    ],
  });
}

async function renderReport(detail: SessionDetail, api: SessionApi) {
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
}

it("pins each intention on the screenshot of the passage the AI chose, with its short label", async () => {
  await renderReport(twoScreensDetail(), fakeApi());

  const images = screen.getAllByRole("img", { name: /^Screenshot at/ });
  expect(images.map((image) => image.getAttribute("src"))).toEqual([
    "https://files.test/e1.png",
  ]);
  expect(
    screen.getByRole("button", { name: `Confirm “${FRAME_LABEL}”` })
  ).toBeTruthy();
  expect(screen.getByText("Not on a screenshot")).toBeTruthy();
  expect(
    screen.getByRole("button", {
      name: "Confirm “Export my settings as a file”",
    })
  ).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Show details" })).toBeNull();
});

it("confirms once from the screenshot even when pressed twice, and undoes from the notice", async () => {
  const api = fakeApi({
    decideProposal: vi
      .fn()
      .mockResolvedValueOnce({ ...FRAME_PROPOSAL, decision: "kept" })
      .mockResolvedValueOnce({ ...FRAME_PROPOSAL, decision: "pending" }),
  });
  await renderReport(twoScreensDetail(), api);

  const confirm = screen.getByRole("button", {
    name: `Confirm “${FRAME_LABEL}”`,
  });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  await waitFor(() =>
    expect(confirm.getAttribute("aria-pressed")).toBe("true")
  );
  expect(api.decideProposal).toHaveBeenCalledTimes(1);
  expect(
    screen.getByRole("button", { name: /^Prepare brief\s*1$/ })
  ).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(() =>
    expect(api.decideProposal).toHaveBeenLastCalledWith({
      decision: "pending",
      proposalId: "proposal_frame",
    })
  );
  expect(confirm.getAttribute("aria-pressed")).toBe("false");
});

it("opens the full intention card from its label", async () => {
  await renderReport(twoScreensDetail(), fakeApi());

  fireEvent.click(screen.getByRole("button", { name: FRAME_LABEL }));

  const card = screen.getByRole("article", {
    name: "Intention: See the whole 1920×1080 canvas in OBS",
  });
  await waitFor(() => expect(document.activeElement).toBe(card));
  fireEvent.click(screen.getByRole("button", { name: "Show intentions" }));
  expect(
    screen
      .getByRole("menuitemradio", { name: "Details" })
      .getAttribute("aria-checked")
  ).toBe("true");
});
