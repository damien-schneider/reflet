import { makeFunctionReference } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  KeepAliveConvexClient,
  UNWATCHED_QUERY_KEEP_ALIVE_MS,
} from "./keep-alive-convex-client";

const getBySlug = makeFunctionReference<"query">(
  "organizations/queries:getBySlug"
);

interface QuerySetModification {
  queryId: number;
  type: "Add" | "Remove";
  udfPath?: string;
}

const SERVER_PING_INTERVAL_MS = 30_000;

class FakeConvexServerSocket {
  static latest: FakeConvexServerSocket | undefined;
  readonly subscribedQueries = new Map<number, string>();
  readyState = 0;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onopen: (() => void) | null = null;

  constructor() {
    FakeConvexServerSocket.latest = this;
  }

  open() {
    this.readyState = 1;
    this.onopen?.();
    setInterval(
      () => this.onmessage?.({ data: JSON.stringify({ type: "Ping" }) }),
      SERVER_PING_INTERVAL_MS
    );
  }

  send(raw: string) {
    const message: { modifications?: QuerySetModification[]; type: string } =
      JSON.parse(raw);
    if (message.type !== "ModifyQuerySet") {
      return;
    }
    for (const modification of message.modifications ?? []) {
      if (modification.type === "Add") {
        this.subscribedQueries.set(
          modification.queryId,
          modification.udfPath ?? ""
        );
      } else {
        this.subscribedQueries.delete(modification.queryId);
      }
    }
  }

  close() {
    this.readyState = 3;
  }
}

const serverQueries = () => [
  ...(FakeConvexServerSocket.latest?.subscribedQueries.values() ?? []),
];

const connectedClient = () => {
  const client = new KeepAliveConvexClient("https://test.convex.cloud", {
    logger: false,
    unsavedChangesWarning: false,
  });
  client.connectionState();
  FakeConvexServerSocket.latest?.open();
  return client;
};

const mountQuery = (client: KeepAliveConvexClient, slug: string) =>
  client.watchQuery(getBySlug, { slug }).onUpdate(vi.fn());

describe("KeepAliveConvexClient", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("WebSocket", FakeConvexServerSocket);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    FakeConvexServerSocket.latest = undefined;
  });

  it("keeps a page's query live on the server after the page unmounts, until the keep-alive window passes", () => {
    const client = connectedClient();
    const unmount = mountQuery(client, "acme");
    expect(serverQueries()).toEqual(["organizations/queries:getBySlug"]);

    unmount();
    vi.advanceTimersByTime(UNWATCHED_QUERY_KEEP_ALIVE_MS - 1);
    expect(serverQueries()).toEqual(["organizations/queries:getBySlug"]);

    vi.advanceTimersByTime(1);
    expect(serverQueries()).toEqual([]);
  });

  it("releases a query watched by two pages once both have unmounted and their windows passed", () => {
    const client = connectedClient();
    const unmountFeedback = mountQuery(client, "acme");
    const unmountMembers = mountQuery(client, "acme");

    unmountFeedback();
    unmountMembers();

    expect(() =>
      vi.advanceTimersByTime(UNWATCHED_QUERY_KEEP_ALIVE_MS)
    ).not.toThrow();
    expect(serverQueries()).toEqual([]);
  });
});
