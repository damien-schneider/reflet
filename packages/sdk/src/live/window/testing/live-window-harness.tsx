import { render, screen, waitFor } from "@testing-library/react";
import { expect, vi } from "vitest";
import {
  LIVE_HUB_ENDPOINTS,
  LIVE_STATUS_OFF,
  type LiveConnections,
  type LiveWindowMessage,
} from "../../protocol";
import { LiveWindow } from "../live-window";

const CONNECTIONS: LiveConnections = {
  connections: [
    { apiUrl: "https://api.reflet.test", id: "acme", organizationName: "Acme" },
  ],
  selectedId: null,
};

export const NO_APPS: LiveWindowMessage = {
  apps: [],
  focus: null,
  kind: "apps",
};

interface HubPost {
  body: unknown;
  path: string;
}

export interface FakeHub {
  drop: () => void;
  postsTo: (path: string) => HubPost[];
  send: (message: LiveWindowMessage) => void;
  streamCount: () => number;
}

function fakeHub(): FakeHub {
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
    postsTo: (path: string) => posts.filter((post) => post.path === path),
    send: (message: LiveWindowMessage) =>
      current().enqueue(encoder.encode(`${JSON.stringify(message)}\n`)),
    streamCount: () => streams.length,
  };
}

export function setUserActivation(hasBeenActive: boolean) {
  Object.defineProperty(navigator, "userActivation", {
    configurable: true,
    value: { hasBeenActive, isActive: hasBeenActive },
  });
}

export function stubMatchMedia() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      addEventListener: vi.fn(),
      matches: false,
      removeEventListener: vi.fn(),
    }))
  );
}

export function fakePictureInPicture() {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const floatingDocument = frame.contentDocument;
  if (!floatingDocument) {
    throw new Error("The test iframe has no document.");
  }
  const floating = Object.assign(new EventTarget(), {
    close: vi.fn(() => {
      floating.dispatchEvent(new Event("pagehide"));
      frame.remove();
    }),
    document: floatingDocument,
  });
  const requestWindow = vi.fn(() => Promise.resolve(floating));
  vi.stubGlobal("documentPictureInPicture", { requestWindow });
  return { document: floatingDocument, floating, requestWindow };
}

export async function openWindow(): Promise<FakeHub> {
  const hub = fakeHub();
  render(<LiveWindow />);
  await waitFor(() => expect(hub.streamCount()).toBe(1));
  hub.send(NO_APPS);
  await screen.findByRole("button", { name: "Record" });
  return hub;
}
