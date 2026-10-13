import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { LocalDraft } from "../../local/session-store";
import {
  aSummary,
  fakeApi,
  fakeRecorder,
  fakeWorkspace,
  renderInWorkspace,
} from "../testing/session-fixtures";
import { SessionsHome } from "./sessions-home";

const local = vi.hoisted(() => {
  const drafts: LocalDraft[] = [];
  return { discardLocalDraft: vi.fn(), drafts };
});
vi.mock("../../local/local-sessions", () => ({
  discardLocalDraft: local.discardLocalDraft,
  purgeAccount: vi.fn(),
  useLocalDrafts: () => local.drafts,
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
  local.drafts = [];
  vi.clearAllMocks();
});

function renderHome(
  workspace = fakeWorkspace(),
  handlers: { onStarted?: () => void; onWriteNote?: () => void } = {}
) {
  const onOpenSession = vi.fn();
  renderInWorkspace(
    <SessionsHome
      onOpenSession={onOpenSession}
      onStarted={handlers.onStarted ?? vi.fn()}
      onWriteNote={handlers.onWriteNote}
    />,
    workspace
  );
  return { onOpenSession };
}

it("names the account sessions are recorded under", () => {
  renderHome();
  expect(screen.getByText("Recording as Ada · Acme")).toBeTruthy();
});

it("explains what a session records on first use for an account, and not on later visits", () => {
  const workspace = fakeWorkspace();
  renderHome(workspace);
  expect(
    screen.getByRole("heading", { name: "What a session records" })
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Start session" }));
  cleanup();

  renderHome(workspace);
  expect(
    screen.queryByRole("heading", { name: "What a session records" })
  ).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "What a session records" })
  );
  expect(
    screen.getByRole("heading", { name: "What a session records" })
  ).toBeTruthy();
});

it("asks for the microphone before anything counts as started", async () => {
  const recorder = fakeRecorder();
  let grant: () => void = () => undefined;
  recorder.start = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        grant = resolve;
      })
  );
  const onStarted = vi.fn();
  renderHome(fakeWorkspace({ recorder }), { onStarted });

  fireEvent.click(screen.getByRole("button", { name: "Start session" }));
  act(() => recorder.emit({ phase: "requesting" }));
  expect(
    screen.getByText("Allow the microphone in your browser to start.")
  ).toBeTruthy();
  expect(onStarted).not.toHaveBeenCalled();

  act(() => recorder.emit({ phase: "recording", sessionKey: "key_1" }));
  await act(async () => grant());
  expect(onStarted).toHaveBeenCalledTimes(1);
});

it("offers to try again or write a note when the microphone is blocked", async () => {
  const recorder = fakeRecorder();
  const onWriteNote = vi.fn();
  renderHome(fakeWorkspace({ recorder }), { onWriteNote });

  fireEvent.click(screen.getByRole("button", { name: "Start session" }));
  act(() =>
    recorder.emit({
      failure: {
        kind: "mic_denied",
        message: "The microphone is blocked for this site.",
      },
      phase: "failed",
    })
  );
  expect(
    screen.getByText("The microphone is blocked for this site.")
  ).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await waitFor(() => expect(recorder.start).toHaveBeenCalledTimes(2));
  fireEvent.click(screen.getByRole("button", { name: "Write a note instead" }));
  expect(onWriteNote).toHaveBeenCalledTimes(1);
});

it("lets an interrupted session be reviewed or resumed, never resumed on its own", async () => {
  local.drafts = [
    {
      lastActiveAt: 1_700_000_060_000,
      sessionId: "session_9",
      sessionKey: "key_9",
      startedAt: 1_700_000_000_000,
      state: "interrupted",
      title: "Pricing page",
    },
  ];
  const recorder = fakeRecorder();
  const { onOpenSession } = renderHome(fakeWorkspace({ recorder }));

  expect(screen.getByText(/stopped when the page reloaded/)).toBeTruthy();
  expect(recorder.resumeDraft).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Resume recording" }));
  await waitFor(() =>
    expect(recorder.resumeDraft).toHaveBeenCalledWith("key_9")
  );

  fireEvent.click(screen.getByRole("button", { name: "Review" }));
  await waitFor(() =>
    expect(onOpenSession).toHaveBeenCalledWith({
      sessionId: "session_9",
      sessionKey: "key_9",
    })
  );
  expect(local.discardLocalDraft).toHaveBeenCalledWith(
    expect.objectContaining({ sessionKey: "key_9" })
  );
});

it("lists my sessions apart from the ones shared with the team", async () => {
  const api = fakeApi({
    list: vi.fn().mockResolvedValue([
      aSummary({ counts: { ...aSummary().counts, kept: 1, proposals: 2 } }),
      aSummary({
        authorName: "Grace",
        id: "session_2",
        isMine: false,
        title: "Onboarding",
        visibility: "team",
      }),
    ]),
  });
  const { onOpenSession } = renderHome(fakeWorkspace({ api }));

  expect(await screen.findByRole("heading", { name: "Mine" })).toBeTruthy();
  expect(
    screen.getByRole("heading", { name: "Shared with the team" })
  ).toBeTruthy();
  expect(screen.getByText(/2 intentions · 1 confirmed/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Onboarding/ }));
  expect(onOpenSession).toHaveBeenCalledWith({
    sessionId: "session_2",
    sessionKey: null,
  });
});

it("lists a session stopped by a reload as interrupted, not recording", async () => {
  local.drafts = [
    {
      lastActiveAt: 1_700_000_060_000,
      sessionId: "session_1",
      sessionKey: "key_1",
      startedAt: 1_700_000_000_000,
      state: "interrupted",
      title: "Pricing page",
    },
  ];
  const api = fakeApi({
    list: vi.fn().mockResolvedValue([aSummary({ collection: "recording" })]),
  });
  renderHome(fakeWorkspace({ api }));

  expect(await screen.findByText("Interrupted · microphone off")).toBeTruthy();
  expect(screen.queryByText("Recording")).toBeNull();
});
