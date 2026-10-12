/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { z } from "zod";
import { sessionSummarySchema } from "../../../../sdk/src/sessions/protocol";
import { internal } from "../../_generated/api";
import {
  SESSION_INTERRUPT_AFTER_MS,
  SESSION_TOMBSTONE_RETENTION_MS,
} from "../constants";
import {
  MEMBER_A,
  pngBlob,
  seedSession,
  setupSessionWorld,
  startSession,
  storeUpload,
  testFrame,
  wavBlob,
} from "./session.fixtures";

const summaryResponse = z.object({ session: sessionSummarySchema });

describe("session lifecycle", () => {
  test("pause, resume and end are idempotent by state", async () => {
    const { a } = await setupSessionWorld();
    const sessionId = await startSession(a);
    const collection = (action: string, atMs: number) =>
      a.post("/api/v1/sessions/collection", { action, atMs, sessionId });

    await collection("pause", 1000);
    await collection("pause", 1500);
    await collection("resume", 4000);
    const ended = summaryResponse.parse((await collection("end", 9000)).body);
    expect(ended.session).toMatchObject({
      collection: "ended",
      durationMs: 6000,
    });
    expect((await collection("end", 12_000)).status).toBe(200);
    expect((await collection("resume", 13_000)).status).toBe(409);

    const detail = await a.get(
      `/api/v1/sessions/detail?sessionId=${sessionId}`
    );
    expect(detail.body).toMatchObject({
      session: { gaps: [{ endMs: 4000, reason: "paused", startMs: 1000 }] },
    });
  });

  test("deleting a session removes its children and files, and later writes are not found", async () => {
    const { a, t } = await setupSessionWorld();
    const sessionId = await startSession(a);
    const audioStorageId = await storeUpload(t, wavBlob());
    const imageStorageId = await storeUpload(t, pngBlob());
    await a.post("/api/v1/sessions/segments", {
      audioStorageId,
      clientKey: "voice-1",
      endMs: 2000,
      sessionId,
      startMs: 1000,
    });
    await a.post("/api/v1/sessions/evidence", {
      atMs: 1000,
      clientKey: "e-1",
      frame: testFrame,
      image: { height: 10, storageId: imageStorageId, width: 10 },
      sessionId,
      trigger: "start",
    });
    await a.post("/api/v1/sessions/events", {
      clientKey: "b-1",
      events: [{ atMs: 10, frame: testFrame, kind: "navigation" }],
      sessionId,
    });
    await a.post("/api/v1/sessions/proposals/create", {
      clientKey: "p-1",
      need: "Keep the cart",
      sessionId,
    });

    const deleted = await a.post("/api/v1/sessions/delete", { sessionId });
    expect(deleted).toEqual({ body: { deleted: true }, status: 200 });
    expect(
      (await a.post("/api/v1/sessions/delete", { sessionId })).body
    ).toEqual({
      deleted: true,
    });

    const remaining = await t.run(async (ctx) => ({
      audio: await ctx.db.system.get(audioStorageId),
      batches: await ctx.db.query("sessionEventBatches").collect(),
      evidence: await ctx.db.query("sessionEvidence").collect(),
      image: await ctx.db.system.get(imageStorageId),
      proposals: await ctx.db.query("sessionProposals").collect(),
      segments: await ctx.db.query("sessionSegments").collect(),
      sessions: await ctx.db.query("sessions").collect(),
    }));
    expect(remaining).toMatchObject({
      audio: null,
      batches: [],
      evidence: [],
      image: null,
      proposals: [],
      segments: [],
    });
    expect(remaining.sessions[0]).toMatchObject({ title: "" });
    expect(remaining.sessions[0]?.deletedAt).toEqual(expect.any(Number));

    const lateWrite = await a.post("/api/v1/sessions/segments", {
      clientKey: "typed-late",
      endMs: 5000,
      sessionId,
      startMs: 4000,
      text: "Too late",
    });
    expect(lateWrite.status).toBe(404);
    expect(
      (await a.get(`/api/v1/sessions/detail?sessionId=${sessionId}`)).status
    ).toBe(404);
    expect((await a.get("/api/v1/sessions/list")).body).toEqual({
      sessions: [],
    });
    expect(
      (
        await a.post("/api/v1/sessions/start", {
          clientKey: "session-1",
          page: { title: "Checkout", url: testFrame.url },
          startedAt: Date.now(),
          surface: "devtools",
        })
      ).status
    ).toBe(409);
  });

  test("the interrupt cron ends sessions left recording or paused", async () => {
    const { organizationId, t } = await setupSessionWorld();
    const staleAt = Date.now() - SESSION_INTERRUPT_AFTER_MS - 1000;
    const ids = await t.run(async (ctx) => ({
      fresh: await seedSession(ctx, {
        authorId: MEMBER_A.userId,
        collection: "recording",
        organizationId,
      }),
      stale: await seedSession(ctx, {
        authorId: MEMBER_A.userId,
        collection: "recording",
        organizationId,
        startedAt: staleAt - 60_000,
        updatedAt: staleAt,
      }),
    }));

    await t.mutation(
      internal.sessions.lifecycle.expiry.endInterruptedSessions,
      {}
    );

    const rows = await t.run(async (ctx) => ({
      fresh: await ctx.db.get(ids.fresh),
      stale: await ctx.db.get(ids.stale),
    }));
    expect(rows.fresh?.collection).toBe("recording");
    expect(rows.stale).toMatchObject({
      collection: "ended",
      endedAt: staleAt,
      gaps: [{ endMs: 60_000, reason: "interrupted", startMs: 60_000 }],
    });
  });

  test("tombstones are purged after the retention period", async () => {
    const { organizationId, t } = await setupSessionWorld();
    const ids = await t.run(async (ctx) => ({
      old: await seedSession(ctx, {
        authorId: MEMBER_A.userId,
        deletedAt: Date.now() - SESSION_TOMBSTONE_RETENTION_MS - 1000,
        organizationId,
      }),
      recent: await seedSession(ctx, {
        authorId: MEMBER_A.userId,
        deletedAt: Date.now(),
        organizationId,
      }),
    }));

    await t.mutation(internal.sessions.lifecycle.removal.purgeTombstones, {});

    const rows = await t.run(async (ctx) => ({
      old: await ctx.db.get(ids.old),
      recent: await ctx.db.get(ids.recent),
    }));
    expect(rows.old).toBeNull();
    expect(rows.recent).not.toBeNull();
  });
});
