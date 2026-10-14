import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { SessionHandoff } from "../../protocol";
import { aHistoryEntry } from "../testing/intention-fixtures";
import {
  aDetail,
  anEvidence,
  aProposal,
  fakeApi,
  fakeWorkspace,
  renderInWorkspace,
} from "../testing/session-fixtures";
import { HandoffView } from "./handoff-view";

const BRIEF =
  "# Session brief\n\n## Make the Save button visible on small screens";

const HANDOFF: SessionHandoff = {
  brief: BRIEF,
  createdAt: 1,
  deliveries: [],
  evidenceIds: ["evidence_1"],
  id: "handoff_1",
  proposals: [
    { id: "proposal_1", need: "Make the Save button visible", revision: 3 },
  ],
};

const writeClipboard = vi.fn();

beforeEach(() => {
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal(
    "ClipboardItem",
    class {
      readonly items: Record<string, Promise<Blob>>;
      constructor(items: Record<string, Promise<Blob>>) {
        this.items = items;
      }
    }
  );
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { write: writeClipboard },
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  writeClipboard.mockReset();
});

function renderHandoff() {
  const api = fakeApi({
    createHandoff: vi.fn().mockResolvedValue({
      files: [
        {
          evidenceId: "evidence_1",
          name: "evidence/E1.png",
          url: "https://files.test/e1.png",
        },
      ],
      handoff: HANDOFF,
    }),
    markHandoffDelivered: vi.fn().mockResolvedValue(HANDOFF),
  });
  const detail = aDetail({
    evidence: [anEvidence()],
    proposals: [
      aProposal({ decision: "kept", evidenceIds: ["evidence_1"] }),
      aProposal({
        decision: "dismissed",
        id: "proposal_2",
        need: "Rename the menu",
      }),
    ],
  });
  renderInWorkspace(
    <HandoffView
      detail={detail}
      review={{ patch: vi.fn(), reload: vi.fn() }}
    />,
    fakeWorkspace({ api })
  );
  return api;
}

it("prepares the brief from kept proposals and their evidence", async () => {
  const api = renderHandoff();

  expect(
    screen.queryByRole("checkbox", { name: /Rename the menu/ })
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Build brief" }));

  await waitFor(() =>
    expect(api.createHandoff).toHaveBeenCalledWith({
      clientKey: expect.any(String),
      evidenceIds: ["evidence_1"],
      proposalIds: ["proposal_1"],
      sessionId: "session_1",
    })
  );
  expect(await screen.findByRole("textbox", { name: "Brief" })).toHaveProperty(
    "value",
    BRIEF
  );
});

it("leaves out what I uncheck", async () => {
  const api = renderHandoff();

  fireEvent.click(screen.getByRole("checkbox", { name: /Marked moment/ }));
  fireEvent.click(screen.getByRole("button", { name: "Build brief" }));

  await waitFor(() =>
    expect(api.createHandoff).toHaveBeenCalledWith(
      expect.objectContaining({ evidenceIds: [] })
    )
  );
});

it("records the copy only once the clipboard took the brief", async () => {
  const api = renderHandoff();
  fireEvent.click(screen.getByRole("button", { name: "Build brief" }));

  writeClipboard.mockRejectedValueOnce(new Error("Denied"));
  fireEvent.click(await screen.findByRole("button", { name: "Copy brief" }));
  expect(await screen.findByText(/The brief was not copied/)).toBeTruthy();
  expect(api.markHandoffDelivered).not.toHaveBeenCalled();

  writeClipboard.mockResolvedValueOnce(undefined);
  fireEvent.click(screen.getByRole("button", { name: "Copy brief" }));
  expect(await screen.findByText("Brief copied")).toBeTruthy();
  expect(api.markHandoffDelivered).toHaveBeenCalledWith({
    handoffId: "handoff_1",
    kind: "copied",
  });
});

it("exports the brief with its evidence files as a zip", async () => {
  const api = renderHandoff();
  const fetchFile = vi
    .fn()
    .mockResolvedValue(new Response(new Uint8Array([1, 2, 3])));
  vi.stubGlobal("fetch", fetchFile);
  const createObjectURL = vi.fn().mockReturnValue("blob:zip");
  vi.stubGlobal(
    "URL",
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
  );
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => undefined);

  fireEvent.click(screen.getByRole("button", { name: "Build brief" }));
  fireEvent.click(await screen.findByRole("button", { name: "Download .zip" }));

  expect(await screen.findByText("Brief downloaded")).toBeTruthy();
  expect(fetchFile).toHaveBeenCalledWith("https://files.test/e1.png");
  expect(createObjectURL.mock.calls[0]?.[0]).toBeInstanceOf(Blob);
  expect(click).toHaveBeenCalled();
  expect(api.markHandoffDelivered).toHaveBeenCalledWith({
    handoffId: "handoff_1",
    kind: "exported",
  });
  click.mockRestore();
});

it("summarizes what changed since the last brief and offers evidence added by later sessions", () => {
  const detail = aDetail({
    contributedEvidence: [
      anEvidence({ atMs: 5000, id: "evidence_9", trigger: "select" }),
    ],
    handoffs: [HANDOFF],
    history: [aHistoryEntry({ evidenceIds: ["evidence_9"] })],
    proposals: [
      aProposal({
        decision: "kept",
        lastHandoff: {
          at: 1_700_000_200_000,
          need: "Make the Save button visible",
          response: null,
          revision: 2,
          unknowns: [],
        },
        response: "Pin the action bar",
        revision: 4,
      }),
    ],
  });
  renderInWorkspace(
    <HandoffView
      detail={detail}
      review={{ patch: vi.fn(), reload: vi.fn() }}
    />,
    fakeWorkspace()
  );

  expect(screen.getByText(/^Changed since your brief of /)).toBeTruthy();
  expect(
    screen.getByText(
      "Need: Make the Save button visible → Make the Save button visible on small screens"
    )
  ).toBeTruthy();
  expect(
    screen.getByText("Considered response: — → Pin the action bar")
  ).toBeTruthy();
  expect(
    screen.getByRole("checkbox", { name: /Pointed element/ })
  ).toHaveProperty("checked", true);
  expect(screen.getByRole("textbox", { name: /^Brief of/ })).toHaveProperty(
    "value",
    BRIEF
  );
  expect(screen.getByText(/ · Not copied yet$/)).toBeTruthy();
});
