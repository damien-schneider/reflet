import { render, screen, waitFor } from "@testing-library/react";
import { expect, vi } from "vitest";
import {
  LIVE_HUB_ENDPOINTS,
  LIVE_STATUS_OFF,
  type LiveConnections,
  type LiveWindowMessage,
} from "../../protocol";
import { LiveWindow } from "../live-window";

export const ACME = {
  apiUrl: "https://api.reflet.test",
  id: "acme",
  organizationName: "Acme",
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

function fakeHub(connections: LiveConnections): FakeHub {
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
        path === LIVE_HUB_ENDPOINTS.connection ? connections : LIVE_STATUS_OFF
      );
    }
    return Response.json(connections);
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

export async function openWindow(
  connections: LiveConnections["connections"] = [ACME]
): Promise<FakeHub> {
  const hub = fakeHub({ connections, selectedId: null });
  render(<LiveWindow />);
  await waitFor(() => expect(hub.streamCount()).toBe(1));
  hub.send(NO_APPS);
  await screen.findByRole("button", { name: "Record" });
  return hub;
}
