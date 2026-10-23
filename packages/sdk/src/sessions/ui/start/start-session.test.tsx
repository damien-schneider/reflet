import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
  fakeRecorder,
  fakeWorkspace,
  IDENTITY,
  renderInWorkspace,
} from "../testing/session-fixtures";
import { StartSession } from "./start-session";

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
  localStorage.clear();
});

function renderStart(speakersConfigured: boolean) {
  const recorder = fakeRecorder();
  renderInWorkspace(<StartSession onStarted={vi.fn()} />, {
    ...fakeWorkspace({ recorder }),
    identity: { ...IDENTITY, speakersConfigured },
  });
  return { recorder };
}

it("offers speaker detection only when Reflet can detect speakers", () => {
  renderStart(false);
  expect(
    screen.queryByRole("checkbox", { name: "Several people are talking" })
  ).toBeNull();
  cleanup();

  renderStart(true);
  const checkbox = screen.getByRole("checkbox", {
    name: "Several people are talking",
  });
  expect(checkbox.getAttribute("aria-describedby")).toBeTruthy();
  expect(
    screen.getByText(
      "Mistral tells the voices apart so each passage shows who spoke."
    )
  ).toBeTruthy();
});

it("starts and retries with the speaker choice that was ticked", async () => {
  const { recorder } = renderStart(true);
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Several people are talking" })
  );
  fireEvent.click(screen.getByRole("button", { name: "Start session" }));
  expect(recorder.start).toHaveBeenCalledWith({ detectSpeakers: true });

  act(() =>
    recorder.emit({
      failure: { kind: "mic_denied", message: "The microphone is blocked." },
      phase: "failed",
    })
  );
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await waitFor(() => expect(recorder.start).toHaveBeenCalledTimes(2));
  expect(recorder.start).toHaveBeenLastCalledWith({ detectSpeakers: true });
});

it("starts a solo session by default", () => {
  const { recorder } = renderStart(true);
  fireEvent.click(screen.getByRole("button", { name: "Start session" }));
  expect(recorder.start).toHaveBeenCalledWith({ detectSpeakers: false });
});
