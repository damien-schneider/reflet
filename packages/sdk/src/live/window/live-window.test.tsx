import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  type FakeRecorder,
  fakeApi,
  fakeRecorder,
  RECORDING_SNAPSHOT,
} from "../../sessions/ui/testing/session-fixtures";
import {
  LIVE_HUB_ENDPOINTS,
  LIVE_STATUS_OFF,
  type LiveConnections,
  type LiveWindowMessage,
} from "../protocol";
import { LiveWindow } from "./live-window";
import { NEEDS_ACTIVATION_MESSAGE } from "./recorder/live-commands";

const mocks = vi.hoisted(() => {
  const hoisted: { recorder: FakeRecorder | null } = { recorder: null };
  return hoisted;
});

vi.mock("../../sessions/recorder/session-recorder", () => ({
  createSessionRecorder: () => mocks.recorder,
}));

vi.mock("../../sessions/api/session-api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  createSessionApi: () => fakeApi(),
}));

vi.mock("../../sessions/local/local-sessions", () => ({
  purgeAccount: vi.fn(),
  useSyncStatus: () => ({
    blockedBy: null,
    isOnline: true,
    lastError: null,
    pendingBytes: 0,
    pendingOperations: 0,
  }),
}));

const CONNECTIONS: LiveConnections = {
  connections: [
    { apiUrl: "https://api.reflet.test", id: "acme", organizationName: "Acme" },
  ],
  selectedId: null,
};

const APPS: LiveWindowMessage = { apps: [], focusedAppId: null, kind: "apps" };

interface HubPost {
  body: unknown;
  path: string;
}

function fakeHub() {
  const posts: HubPost[] = [];
  const streams: ReadableStreamDefaultController<Uint8Array>[] = [];
  const encoder = new TextEncoder();
  const respond = (path: string, init: RequestInit | undefined) => {
    if (path === LIVE_HUB_ENDPOINTS.windowStream) {
      return new Response(
        new ReadableStream<Uint8Array>({
          start: (controller) => {
            streams.push(controller);
            init?.signal?.addEventListener("abort", () =>
              controller.error(new DOMException("Aborted", "AbortError"))
            );
          },
        })
      );
    }
    if (init?.method === "POST") {
      posts.push({ body: JSON.parse(String(init.body)), path });
      return Response.json(
        path === LIVE_HUB_ENDPOINTS.connection ? CONNECTIONS : LIVE_STATUS_OFF
      );
    }
    return Response.json(CONNECTIONS);
  };
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string, init?: RequestInit) =>
      Promise.resolve(respond(input, init))
    )
  );

  const current = () => {
    const stream = streams.at(-1);
    if (!stream) {
      throw new Error("The window has not opened the hub stream yet.");
    }
    return stream;
  };
  return {
    drop: () => current().close(),
    posts,
    postsTo: (path: string) => posts.filter((post) => post.path === path),
    send: (message: LiveWindowMessage) =>
      current().enqueue(encoder.encode(`${JSON.stringify(message)}\n`)),
    streamCount: () => streams.length,
  };
}

function setUserActivation(hasBeenActive: boolean) {
  Object.defineProperty(navigator, "userActivation", {
    configurable: true,
    value: { hasBeenActive, isActive: hasBeenActive },
  });
}

async function openWindow() {
  const hub = fakeHub();
  render(<LiveWindow />);
  await waitFor(() => expect(hub.streamCount()).toBe(1));
  hub.send(APPS);
  await screen.findByRole("button", { name: "Record" });
  return hub;
}

beforeEach(() => {
  mocks.recorder = fakeRecorder();
  setUserActivation(false);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  localStorage.clear();
});

it("starts recording from a remote Record only once the window has been clicked", async () => {
  const hub = await openWindow();
  const recorder = mocks.recorder;

  hub.send({ action: "start", id: "c1", kind: "command" });
  expect(await screen.findByText(NEEDS_ACTIVATION_MESSAGE)).toBeTruthy();
  expect(recorder?.start).not.toHaveBeenCalled();

  setUserActivation(true);
  fireEvent.pointerDown(window);
  hub.send({ action: "start", id: "c2", kind: "command" });

  await waitFor(() =>
    expect(recorder?.start).toHaveBeenCalledWith({ detectSpeakers: false })
  );
  await waitFor(() =>
    expect(hub.postsTo(LIVE_HUB_ENDPOINTS.windowState).at(-1)?.body).toEqual(
      expect.objectContaining({ canStart: true })
    )
  );
});

it("keeps recording when the hub stream drops and tells the hub again once it is back", async () => {
  const hub = await openWindow();
  mocks.recorder?.emit(RECORDING_SNAPSHOT);
  await screen.findByRole("button", { name: "Pause" });

  vi.useFakeTimers({ toFake: ["setTimeout"] });
  hub.drop();
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(
    screen.getByText(
      "Reflet Live stopped in the terminal: run npx reflet-cli live again."
    )
  ).toBeTruthy();
  expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
  const statePosts = hub.postsTo(LIVE_HUB_ENDPOINTS.windowState).length;
  const connectionPosts = hub.postsTo(LIVE_HUB_ENDPOINTS.connection).length;

  await act(() => vi.advanceTimersByTimeAsync(2000));
  vi.useRealTimers();
  expect(hub.streamCount()).toBe(2);
  hub.send(APPS);

  await waitFor(() => {
    expect(hub.postsTo(LIVE_HUB_ENDPOINTS.connection)).toHaveLength(
      connectionPosts + 1
    );
    expect(hub.postsTo(LIVE_HUB_ENDPOINTS.windowState).length).toBeGreaterThan(
      statePosts
    );
  });
  expect(hub.postsTo(LIVE_HUB_ENDPOINTS.connection).at(-1)?.body).toEqual({
    id: "acme",
  });
  expect(hub.postsTo(LIVE_HUB_ENDPOINTS.windowState).at(-1)?.body).toEqual(
    expect.objectContaining({ phase: "recording", sessionId: "session_1" })
  );
  expect(mocks.recorder?.dispose).not.toHaveBeenCalled();
});
