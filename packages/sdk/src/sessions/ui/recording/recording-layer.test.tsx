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
  RECORDING_SNAPSHOT,
  renderInWorkspace,
} from "../testing/session-fixtures";
import { RecordingLayer } from "./recording-layer";

const syncStatus = vi.hoisted(() => ({
  blockedBy: null,
  isOnline: true,
  lastError: null,
  pendingBytes: 0,
  pendingOperations: 2,
}));

vi.mock("../../local/local-sessions", () => ({
  purgeAccount: vi.fn(),
  useSyncStatus: () => syncStatus,
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  syncStatus.isOnline = true;
});

function renderLayer(recorder = fakeRecorder(RECORDING_SNAPSHOT)) {
  const onFinished = vi.fn();
  renderInWorkspace(
    <RecordingLayer onFinished={onFinished} />,
    fakeWorkspace({ recorder })
  );
  return { onFinished, recorder };
}

it("shows no recording bar while the microphone is still being asked for", () => {
  renderLayer(fakeRecorder({ ...RECORDING_SNAPSHOT, phase: "requesting" }));
  expect(
    screen.queryByRole("toolbar", { name: "Session recording" })
  ).toBeNull();
});

it("shows elapsed time while recording", () => {
  renderLayer();
  expect(
    screen.getByRole("toolbar", { name: "Session recording" })
  ).toBeTruthy();
  expect(
    screen.getByLabelText("Recording, 2 minutes 14 seconds").textContent
  ).toBe("02:14");
});

it("says the recording is kept on the device while offline", () => {
  syncStatus.isOnline = false;
  renderLayer();
  expect(screen.getByText("Offline — kept on this device")).toBeTruthy();
});

it("says when speakers stop being detected, after sync problems", () => {
  renderLayer(fakeRecorder({ ...RECORDING_SNAPSHOT, speakers: "unavailable" }));
  expect(screen.getByText("Speakers aren't being detected")).toBeTruthy();
  cleanup();

  syncStatus.isOnline = false;
  renderLayer(fakeRecorder({ ...RECORDING_SNAPSHOT, speakers: "unavailable" }));
  expect(screen.getByText("Offline — kept on this device")).toBeTruthy();
});

it("offers a note for a marked moment and saves it on Enter", () => {
  const { recorder } = renderLayer();
  fireEvent.click(screen.getByRole("button", { name: /Mark moment/ }));
  expect(recorder.mark).toHaveBeenCalledTimes(1);

  const note = screen.getByRole("textbox", {
    name: "Moment marked · Add a note",
  });
  fireEvent.change(note, { target: { value: "The total is wrong" } });
  fireEvent.keyDown(note, { key: "Enter" });
  expect(recorder.annotateMark).toHaveBeenCalledWith(
    "mark_1",
    "The total is wrong"
  );
  expect(screen.queryByRole("textbox")).toBeNull();
});

it("closes an untouched mark note after a few seconds", () => {
  vi.useFakeTimers();
  const { recorder } = renderLayer();
  fireEvent.click(screen.getByRole("button", { name: /Mark moment/ }));
  act(() => vi.advanceTimersByTime(6000));
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(recorder.annotateMark).toHaveBeenCalledWith("mark_1", "");
});

it("marks a moment with Alt+Shift+M", () => {
  const { recorder } = renderLayer();
  fireEvent.keyDown(document, {
    altKey: true,
    code: "KeyM",
    key: "µ",
    shiftKey: true,
  });
  expect(recorder.mark).toHaveBeenCalledTimes(1);
});

it("pauses and resumes on demand", () => {
  const { recorder } = renderLayer();
  fireEvent.click(screen.getByRole("button", { name: "Pause" }));
  expect(recorder.pause).toHaveBeenCalledWith("paused");

  act(() => recorder.emit({ pauseReason: "paused", phase: "paused" }));
  fireEvent.click(screen.getByRole("button", { name: "Resume" }));
  expect(recorder.resume).toHaveBeenCalledTimes(1);
});

it("cancels the recording only once the user confirms", async () => {
  const { onFinished, recorder } = renderLayer();
  fireEvent.click(screen.getByRole("button", { name: "Cancel recording" }));
  const keep = screen.getByRole("button", { name: "Keep recording" });
  expect(document.activeElement).toBe(keep);
  fireEvent.keyDown(keep, { key: "Escape" });
  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "Cancel recording" })
  );

  fireEvent.click(screen.getByRole("button", { name: "Cancel recording" }));
  fireEvent.click(screen.getByRole("button", { name: "Discard" }));
  await waitFor(() => expect(recorder.cancel).toHaveBeenCalledTimes(1));
  expect(recorder.finish).not.toHaveBeenCalled();
  expect(onFinished).not.toHaveBeenCalled();
});

it("explains a pause caused by hiding the tab", () => {
  renderLayer(
    fakeRecorder({
      ...RECORDING_SNAPSHOT,
      pauseReason: "hidden",
      phase: "paused",
    })
  );
  expect(screen.getByText("Paused because the tab was hidden")).toBeTruthy();
});

it("opens the review of the session it finishes", async () => {
  const { onFinished, recorder } = renderLayer();
  fireEvent.click(screen.getByRole("button", { name: "Finish" }));
  await waitFor(() =>
    expect(onFinished).toHaveBeenCalledWith({
      sessionId: "session_1",
      sessionKey: "key_1",
    })
  );
  expect(recorder.finish).toHaveBeenCalledTimes(1);
});
