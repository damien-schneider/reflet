import { describe, expect, it } from "vitest";
import { SESSION_SUMMARY } from "../testing/fake-session-server";
import { createSessionApi, type SessionRequest } from "./session-api";

function fakeTransport(response: unknown) {
  const requests: SessionRequest<unknown>[] = [];
  return {
    requests,
    transport: {
      request<T>(options: SessionRequest<T>): Promise<T> {
        requests.push(options);
        return Promise.resolve(response).then((body) =>
          options.schema.parse(body)
        );
      },
    },
  };
}

describe("createSessionApi", () => {
  it("posts the start body and unwraps the parsed session", async () => {
    const { requests, transport } = fakeTransport({ session: SESSION_SUMMARY });
    const session = await createSessionApi(transport).start({
      clientKey: "k1",
      page: { title: "Home", url: "https://app.test/" },
      startedAt: 1000,
      surface: "devtools",
    });
    expect(session.id).toBe(SESSION_SUMMARY.id);
    expect(requests[0]).toMatchObject({
      method: "POST",
      path: "/api/v1/sessions/start",
    });
  });

  it("rejects a response that does not match the protocol", async () => {
    const { transport } = fakeTransport({ session: { id: "s1" } });
    await expect(createSessionApi(transport).list()).rejects.toThrow();
  });

  it("asks the detail with the session id in the query", async () => {
    const { requests, transport } = fakeTransport(null);
    await expect(createSessionApi(transport).detail("s1")).rejects.toThrow();
    expect(requests[0]).toMatchObject({
      method: "GET",
      path: "/api/v1/sessions/detail",
      query: { sessionId: "s1" },
    });
  });
});
