/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  sessionDetailSchema,
  sessionIdentitySchema,
  sessionProposalSchema,
  sessionSegmentSchema,
  sessionSummarySchema,
} from "../../../../sdk/src/sessions/protocol";
import {
  errorBody,
  type SessionClient,
  sessionClient,
  setupSessionWorld,
  startSession,
  testFrame,
} from "./session.fixtures";

const NOT_FOUND = { error: "Session not found" };

interface SeededSession {
  proposalId: string;
  segmentId: string;
  sessionId: string;
}

async function seedPrivateSession(a: SessionClient): Promise<SeededSession> {
  const sessionId = await startSession(a);
  const segment = await a.post("/api/v1/sessions/segments", {
    clientKey: "typed-1",
    endMs: 2000,
    sessionId,
    startMs: 1000,
    text: "The cart empties when I reload",
  });
  const proposal = await a.post("/api/v1/sessions/proposals/create", {
    clientKey: "proposal-1",
    need: "Keep my cart after a reload",
    sessionId,
  });
  return {
    proposalId: z
      .object({ proposal: sessionProposalSchema })
      .parse(proposal.body).proposal.id,
    segmentId: z.object({ segment: sessionSegmentSchema }).parse(segment.body)
      .segment.id,
    sessionId,
  };
}

function writesOn(ids: SeededSession) {
  return [
    [
      "/api/v1/sessions/segments/correct",
      { expectedRevision: 0, segmentId: ids.segmentId, text: "x" },
    ],
    [
      "/api/v1/sessions/proposals/decide",
      { decision: "kept", proposalId: ids.proposalId },
    ],
    [
      "/api/v1/sessions/evidence",
      {
        atMs: 10,
        clientKey: "e-b",
        frame: testFrame,
        sessionId: ids.sessionId,
        trigger: "manual",
      },
    ],
    [
      "/api/v1/sessions/handoffs",
      {
        clientKey: "h-b",
        evidenceIds: [],
        proposalIds: [ids.proposalId],
        sessionId: ids.sessionId,
      },
    ],
    [
      "/api/v1/sessions/handoffs/preview",
      {
        evidenceIds: [],
        proposalIds: [ids.proposalId],
        sessionId: ids.sessionId,
      },
    ],
    ["/api/v1/sessions/delete", { sessionId: ids.sessionId }],
  ] as const;
}

describe("session access over HTTP", () => {
  test("a member reads their identity and their own session", async () => {
    const { a } = await setupSessionWorld();
    const identity = await a.get("/api/v1/sessions/identity");
    expect(sessionIdentitySchema.parse(identity.body)).toMatchObject({
      organizationName: "Acme",
      user: { email: "ada@acme.test", id: "user-a", name: "Ada" },
    });

    const { sessionId } = await seedPrivateSession(a);
    const detail = await a.get(
      `/api/v1/sessions/detail?sessionId=${sessionId}`
    );
    expect(detail.status).toBe(200);
    expect(sessionDetailSchema.parse(detail.body).session).toMatchObject({
      authorName: "Ada",
      canEdit: true,
      isMine: true,
    });
  });

  test("another member of the organization cannot see or touch a private session", async () => {
    const { a, b } = await setupSessionWorld();
    const ids = await seedPrivateSession(a);

    const detail = await b.get(
      `/api/v1/sessions/detail?sessionId=${ids.sessionId}`
    );
    expect(detail).toEqual({ body: NOT_FOUND, status: 404 });
    for (const [path, body] of writesOn(ids)) {
      expect(await b.post(path, body)).toEqual({
        body: NOT_FOUND,
        status: 404,
      });
    }
    const list = await b.get("/api/v1/sessions/list");
    expect(list.body).toEqual({ sessions: [] });
  });

  test("a shared session is readable by the team but only the author changes it", async () => {
    const { a, b } = await setupSessionWorld();
    const ids = await seedPrivateSession(a);
    await a.post("/api/v1/sessions/update", {
      sessionId: ids.sessionId,
      visibility: "team",
    });

    const detail = await b.get(
      `/api/v1/sessions/detail?sessionId=${ids.sessionId}`
    );
    expect(sessionDetailSchema.parse(detail.body).session).toMatchObject({
      canEdit: false,
      isMine: false,
      visibility: "team",
    });
    const list = z
      .object({ sessions: z.array(sessionSummarySchema) })
      .parse((await b.get("/api/v1/sessions/list")).body);
    expect(list.sessions.map((session) => session.id)).toEqual([ids.sessionId]);
    for (const [path, body] of writesOn(ids)) {
      expect((await b.post(path, body)).status).toBe(403);
    }
  });

  test("another organization's member gets not found", async () => {
    const { a, outsider } = await setupSessionWorld();
    const ids = await seedPrivateSession(a);
    await a.post("/api/v1/sessions/update", {
      sessionId: ids.sessionId,
      visibility: "team",
    });

    const detail = await outsider.get(
      `/api/v1/sessions/detail?sessionId=${ids.sessionId}`
    );
    expect(detail).toEqual({ body: NOT_FOUND, status: 404 });
    for (const [path, body] of writesOn(ids)) {
      expect((await outsider.post(path, body)).status).toBe(404);
    }
  });

  test("API keys are refused and bad member tokens are unauthorized", async () => {
    const { t } = await setupSessionWorld();
    for (const key of ["fb_sec_secret", "fb_pub_public"]) {
      const response = await sessionClient(t, key).get("/api/v1/sessions/list");
      expect(response).toEqual({
        body: {
          error:
            "Sessions need a signed-in Reflet member. Connect from the devtools panel.",
        },
        status: 403,
      });
    }
    const expired = await sessionClient(t, `fb_dev_${"z".repeat(64)}`).get(
      "/api/v1/sessions/list"
    );
    expect(expired.status).toBe(401);
    const teamWithoutOrigin = await sessionClient(
      t,
      `fb_team_${"z".repeat(64)}`
    ).get("/api/v1/sessions/list");
    expect(teamWithoutOrigin.status).toBe(401);
  });

  test("every session path answers the CORS preflight", async () => {
    const { t } = await setupSessionWorld();
    const response = await t.fetch("/api/v1/sessions/proposals/feedback", {
      method: "OPTIONS",
    });
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  test("invalid bodies are rejected before reaching the domain", async () => {
    const { a } = await setupSessionWorld();
    const response = await a.post("/api/v1/sessions/start", { clientKey: "" });
    expect(response.status).toBe(400);
    expect(errorBody.parse(response.body).error).toBe("Invalid JSON body");
  });
});
