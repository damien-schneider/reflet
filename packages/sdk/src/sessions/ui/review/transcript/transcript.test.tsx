import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { SessionDetail } from "../../../protocol";
import {
  aDetail,
  aSegment,
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

async function openTranscript(detail: SessionDetail, api = fakeApi()) {
  api.detail = vi.fn().mockResolvedValue(detail);
  renderInWorkspace(
    <SessionReview
      isBriefOpen={false}
      links={reviewLinks()}
      sessionId="session_1"
    />,
    fakeWorkspace({ api })
  );
  fireEvent.click(await screen.findByRole("tab", { name: "Transcript" }));
  return api;
}

it("corrects a passage against the revision it was read at", async () => {
  const api = fakeApi({
    correctSegment: vi.fn().mockResolvedValue(
      aSegment({
        revision: 3,
        text: "I can never find Save.",
        textOrigin: "human",
      })
    ),
  });
  await openTranscript(aDetail(), api);

  expect(screen.getByText("00:02")).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Edit passage at 00:02" })
  );
  fireEvent.change(screen.getByRole("textbox", { name: "Passage at 00:02" }), {
    target: { value: "I can never find Save." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() =>
    expect(api.correctSegment).toHaveBeenCalledWith({
      expectedRevision: 2,
      segmentId: "segment_1",
      text: "I can never find Save.",
    })
  );
  expect(await screen.findByText("I can never find Save.")).toBeTruthy();
});

it("retries a failed transcription while its audio is kept", async () => {
  const failed = aSegment({
    hasAudio: true,
    text: "",
    transcription: { attempts: 3, error: "Timeout", state: "failed" },
  });
  const api = fakeApi({
    retrySegment: vi.fn().mockResolvedValue({
      ...failed,
      transcription: { attempts: 3, error: null, state: "pending" },
    }),
  });
  await openTranscript(aDetail({ segments: [failed] }), api);

  expect(screen.getByText("Couldn't transcribe")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await waitFor(() =>
    expect(api.retrySegment).toHaveBeenCalledWith("segment_1")
  );
  expect(await screen.findByText("Transcribing…")).toBeTruthy();
});

it("lets me type what a failed passage said", async () => {
  const failed = aSegment({
    text: "",
    transcription: { attempts: 3, error: "Timeout", state: "failed" },
  });
  const api = fakeApi({
    correctSegment: vi.fn().mockResolvedValue(
      aSegment({
        revision: 3,
        text: "The total looks wrong",
        textOrigin: "human",
      })
    ),
  });
  await openTranscript(aDetail({ segments: [failed] }), api);

  expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Type it" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Passage at 00:02" }), {
    target: { value: "The total looks wrong" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(api.correctSegment).toHaveBeenCalledWith(
      expect.objectContaining({ text: "The total looks wrong" })
    )
  );
});

it("lands on the same moment from an intention's quote and from the transcript", async () => {
  const api = fakeApi();
  api.detail = vi.fn().mockResolvedValue(aDetail());
  renderInWorkspace(
    <SessionReview
      isBriefOpen={false}
      links={reviewLinks()}
      sessionId="session_1"
    />,
    fakeWorkspace({ api })
  );
  const showContext = await screen.findByRole("button", {
    description: "Show the moment",
  });
  fireEvent.click(showContext);

  const heading = screen.getByRole("heading", { name: "Moment 00:02–00:09" });
  expect(document.activeElement).toBe(heading);
  fireEvent.keyDown(heading, { key: "Escape" });
  expect(document.activeElement).toBe(showContext);

  fireEvent.click(screen.getByRole("tab", { name: "Transcript" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Show the moment at 00:02" })
  );
  expect(
    screen.getByRole("heading", { name: "Moment 00:02–00:09" })
  ).toBeTruthy();
});
