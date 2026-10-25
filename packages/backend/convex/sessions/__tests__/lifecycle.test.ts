/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  sessionDetailSchema,
  sessionEvidenceSchema,
  sessionSummarySchema,
} from "../../../../sdk/src/sessions/protocol";
import { internal } from "../../_generated/api";
import {
  LIVE_SESSION_RETENTION_MS,
  SESSION_INTERRUPT_AFTER_MS,
  SESSION_TOMBSTONE_RETENTION_MS,
} from "../constants";
import {
  addProposal,
  MEMBER_A,
  pngBlob,
  seedSession,
  setupSessionWorld,
  startSession,
  storeUpload,
  testFrame,
  wavBlob,
} from "./session.fixtures";

const HOUR_MS = 3_600_000;

const summaryResponse = z.object({ session: sessionSummarySchema });
const evidenceResponse = z.object({ evidence: sessionEvidenceSchema });

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
    const turns = await a.post("/api/v1/sessions/speakers", {
      clientKey: "turns-1",
      sessionId,
      turns: [{ endMs: 1800, speaker: "S1", startMs: 1200 }],
    });
    expect(turns.body).toEqual({ accepted: 1, dropped: 0 });
    await addProposal(t, { need: "Keep the cart", sessionId });

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
      speakerTurns: await ctx.db.query("sessionSpeakerTurns").collect(),
    }));
    expect(remaining).toMatchObject({
      audio: null,
      batches: [],
      evidence: [],
      image: null,
      proposals: [],
      segments: [],
      speakerTurns: [],
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

  test("removing one screenshot deletes its file for good and leaves the rest", async () => {
    const { a, b, t } = await setupSessionWorld();
    const sessionId = await startSession(a);
    const register = async (clientKey: string, storageId: string) =>
      evidenceResponse.parse(
        (
          await a.post("/api/v1/sessions/evidence", {
            atMs: 1000,
            clientKey,
            frame: testFrame,
            image: { height: 10, storageId, width: 10 },
            sessionId,
            trigger: "mark",
          })
        ).body
      ).evidence;
    const sensitiveFile = await storeUpload(t, pngBlob());
    const sensitive = await register("e-sensitive", sensitiveFile);
    const kept = await register("e-kept", await storeUpload(t, pngBlob()));
    const removal = { evidenceId: sensitive.id };

    expect(
      (await b.post("/api/v1/sessions/evidence/remove", removal)).status
    ).toBe(404);
    const removed = await a.post("/api/v1/sessions/evidence/remove", removal);
    expect(removed.status).toBe(200);
    expect(evidenceResponse.parse(removed.body).evidence).toMatchObject({
      image: null,
      missingReason: "Removed from the session.",
      status: "missing",
    });
    expect(
      (await a.post("/api/v1/sessions/evidence/remove", removal)).status
    ).toBe(200);
    const replayedUpload = await storeUpload(t, pngBlob());
    await register("e-sensitive", replayedUpload);

    const files = await t.run(async (ctx) => ({
      removed: await ctx.db.system.get(sensitiveFile),
      replayed: await ctx.db.system.get(replayedUpload),
    }));
    expect(files).toEqual({ removed: null, replayed: null });
    const detail = sessionDetailSchema.parse(
      (await a.get(`/api/v1/sessions/detail?sessionId=${sessionId}`)).body
    );
    expect(detail.evidence.map(({ id, status }) => ({ id, status }))).toEqual([
      { id: sensitive.id, status: "missing" },
      { id: kept.id, status: "available" },
    ]);

    const link = evidenceResponse.parse(
      (
        await a.post("/api/v1/sessions/evidence", {
          atMs: 2000,
          clientKey: "e-link",
          link: { access: "", label: "Ticket", url: "https://tracker.test/1" },
          sessionId,
          trigger: "manual",
        })
      ).body
    ).evidence;
    expect(
      (
        await a.post("/api/v1/sessions/evidence/remove", {
          evidenceId: link.id,
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

  test("a live session survives an idle stretch that ends other sessions", async () => {
    const { organizationId, t } = await setupSessionWorld();
    const idleAt = Date.now() - 2 * HOUR_MS;
    const idle = (surface: "devtools" | "live") => ({
      authorId: MEMBER_A.userId,
      collection: "recording" as const,
      organizationId,
      startedAt: idleAt - 60_000,
      surface,
      updatedAt: idleAt,
    });
    const ids = await t.run(async (ctx) => ({
      devtools: await seedSession(ctx, idle("devtools")),
      live: await seedSession(ctx, idle("live")),
    }));

    await t.mutation(
      internal.sessions.lifecycle.expiry.endInterruptedSessions,
      {}
    );

    const rows = await t.run(async (ctx) => ({
      devtools: await ctx.db.get(ids.devtools),
      live: await ctx.db.get(ids.live),
    }));
    expect(rows.live?.collection).toBe("recording");
    expect(rows.devtools?.collection).toBe("ended");
  });

  test("live sessions are erased a day after their last update", async () => {
    const { organizationId, t } = await setupSessionWorld();
    const expiredAt = Date.now() - LIVE_SESSION_RETENTION_MS - 1000;
    const ids = await t.run(async (ctx) => {
      const old = await seedSession(ctx, {
        authorId: MEMBER_A.userId,
        organizationId,
        surface: "live",
        updatedAt: expiredAt,
      });
      const segment = await ctx.db.insert("sessionSegments", {
        clientKey: "segment-old",
        createdAt: expiredAt,
        endMs: 3000,
        organizationId,
        revision: 1,
        sessionId: old,
        source: "voice",
        startMs: 0,
        text: "Keep the folder.",
        textOrigin: "transcription",
        transcription: { attempts: 1, state: "done", updatedAt: expiredAt },
        updatedAt: expiredAt,
      });
      return {
        devtools: await seedSession(ctx, {
          authorId: MEMBER_A.userId,
          organizationId,
          updatedAt: expiredAt,
        }),
        old,
        recent: await seedSession(ctx, {
          authorId: MEMBER_A.userId,
          organizationId,
          surface: "live",
          updatedAt: Date.now() - HOUR_MS,
        }),
        segment,
      };
    });

    await t.mutation(
      internal.sessions.lifecycle.removal.expireLiveSessions,
      {}
    );

    const rows = await t.run(async (ctx) => ({
      devtools: await ctx.db.get(ids.devtools),
      old: await ctx.db.get(ids.old),
      recent: await ctx.db.get(ids.recent),
      segment: await ctx.db.get(ids.segment),
    }));
    expect(rows.old?.deletedAt).toEqual(expect.any(Number));
    expect(rows.segment).toBeNull();
    expect(rows.recent?.deletedAt).toBeUndefined();
    expect(rows.devtools?.deletedAt).toBeUndefined();
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
