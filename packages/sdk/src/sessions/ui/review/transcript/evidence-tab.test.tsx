import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { SessionDetail } from "../../../protocol";
import {
  aDetail,
  anEvidence,
  aSummary,
  fakeApi,
  fakeWorkspace,
  renderInWorkspace,
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

const REMOVE_LABEL = "Remove screenshot at 02:14";

async function openEvidence(detail: SessionDetail, api = fakeApi()) {
  api.detail = vi.fn().mockResolvedValue(detail);
  renderInWorkspace(
    <SessionReview onBack={vi.fn()} sessionId="session_1" />,
    fakeWorkspace({ api })
  );
  fireEvent.click(await screen.findByRole("button", { name: /^Evidence/ }));
  return api;
}

it("removes one sensitive screenshot after confirming, keeping the others", async () => {
  const api = fakeApi({
    removeEvidence: vi.fn().mockResolvedValue(
      anEvidence({
        image: null,
        missingReason: "Removed from the session.",
        status: "missing",
      })
    ),
  });
  const kept = anEvidence({ atMs: 200_000, id: "evidence_2" });
  await openEvidence(aDetail({ evidence: [anEvidence(), kept] }), api);

  fireEvent.click(screen.getByRole("button", { name: REMOVE_LABEL }));
  expect(api.removeEvidence).not.toHaveBeenCalled();
  expect(
    screen.getByText(/Briefs you already copied or exported can't be recalled/)
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Remove" }));

  expect(
    await screen.findByText("Screenshot missing: Removed from the session.")
  ).toBeTruthy();
  expect(api.removeEvidence).toHaveBeenCalledWith("evidence_1");
  expect(screen.queryByRole("button", { name: REMOVE_LABEL })).toBeNull();
  expect(
    screen.getByRole("button", { name: "Remove screenshot at 03:20" })
  ).toBeTruthy();
});

it("keeps the screenshot when the removal is cancelled", async () => {
  const api = await openEvidence(aDetail({ evidence: [anEvidence()] }));

  fireEvent.click(screen.getByRole("button", { name: REMOVE_LABEL }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(api.removeEvidence).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: REMOVE_LABEL })).toBeTruthy();
});

it("offers removal from the enlarged view", async () => {
  const api = fakeApi({
    removeEvidence: vi
      .fn()
      .mockResolvedValue(anEvidence({ image: null, status: "missing" })),
  });
  await openEvidence(aDetail({ evidence: [anEvidence()] }), api);

  fireEvent.click(screen.getByRole("button", { name: /^Enlarge/ }));
  fireEvent.click(screen.getByRole("button", { name: REMOVE_LABEL }));
  fireEvent.click(screen.getByRole("button", { name: "Remove" }));

  expect(await screen.findByText(/^Screenshot missing/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: /^Enlarge/ })).toBeNull();
});

it("does not offer removal to a teammate reading the session", async () => {
  await openEvidence(
    aDetail({
      evidence: [anEvidence()],
      session: {
        ...aSummary(),
        canEdit: false,
        gaps: [],
        startUrl: null,
      },
    })
  );

  expect(screen.getByRole("button", { name: /^Enlarge/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: REMOVE_LABEL })).toBeNull();
});
