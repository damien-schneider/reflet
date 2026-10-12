/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  sessionEvidenceSchema,
  sessionSegmentSchema,
  sessionSummarySchema,
} from "../../../../sdk/src/sessions/protocol";
import type { Id } from "../../_generated/dataModel";
import type { TestContext } from "../../test.helpers";
import { SESSION_LIMITS } from "../constants";
import {
  errorBody,
  pngBlob,
  setupSessionWorld,
  startSession,
  storeUpload,
  testFrame,
  wavBlob,
} from "./session.fixtures";

const segmentResponse = z.object({ segment: sessionSegmentSchema });
const scrollAt = (atMs: number) => ({
  atMs,
  kind: "scroll",
  scrollX: 0,
  scrollY: atMs,
});

async function sessionRow(t: TestContext, sessionId: string) {
  return await t.run(async (ctx) => {
    const id = ctx.db.normalizeId("sessions", sessionId);
    return id ? await ctx.db.get(id) : null;
  });
}

describe("session capture", () => {
  test("start is idempotent per client key and clamps a skewed start time", async () => {
    const { a } = await setupSessionWorld();
    const body = {
      clientKey: "s-1",
      page: { title: "Checkout", url: testFrame.url },
      startedAt: 0,
      surface: "devtools",
    };
    const first = z
      .object({ session: sessionSummarySchema })
      .parse((await a.post("/api/v1/sessions/start", body)).body);
    const replay = z
      .object({ session: sessionSummarySchema })
      .parse((await a.post("/api/v1/sessions/start", body)).body);
    expect(replay.session.id).toBe(first.session.id);
    expect(first.session.startedAt).toBeGreaterThan(
      Date.now() - 25 * 60 * 60_000
    );
    expect(first.session.title).toBe("Checkout");
  });

  test("event batches replay without duplicates and drop what falls in a pause", async () => {
    const { a, t } = await setupSessionWorld();
    const sessionId = await startSession(a);
    await a.post("/api/v1/sessions/collection", {
      action: "pause",
      atMs: 1000,
      sessionId,
    });
    await a.post("/api/v1/sessions/collection", {
      action: "resume",
      atMs: 5000,
      sessionId,
    });
    const batch = {
      clientKey: "batch-1",
      events: [scrollAt(500), scrollAt(2000), scrollAt(6000)],
      sessionId,
    };

    const first = await a.post("/api/v1/sessions/events", batch);
    expect(first.body).toEqual({
      accepted: 2,
      dropped: 1,
      limitReached: false,
    });
    const replay = await a.post("/api/v1/sessions/events", batch);
    expect(replay.body).toMatchObject({ accepted: 2 });
    expect((await sessionRow(t, sessionId))?.usage.eventCount).toBe(2);
  });

  test("events after the end are dropped and the event limit is reported", async () => {
    const { a, t } = await setupSessionWorld();
    const sessionId = await startSession(a);
    await t.run(async (ctx) => {
      const id = ctx.db.normalizeId("sessions", sessionId);
      const session = id ? await ctx.db.get(id) : null;
      if (id && session) {
        await ctx.db.patch(id, {
          usage: { ...session.usage, eventCount: SESSION_LIMITS.maxEvents - 1 },
        });
      }
    });
    const capped = await a.post("/api/v1/sessions/events", {
      clientKey: "batch-1",
      events: [scrollAt(100), scrollAt(200)],
      sessionId,
    });
    expect(capped.body).toEqual({
      accepted: 1,
      dropped: 1,
      limitReached: true,
    });

    await a.post("/api/v1/sessions/collection", {
      action: "end",
      atMs: 3000,
      sessionId,
    });
    const late = await a.post("/api/v1/sessions/events", {
      clientKey: "batch-2",
      events: [scrollAt(4000)],
      sessionId,
    });
    expect(late.body).toMatchObject({ accepted: 0, dropped: 1 });
  });

  test("a voice passage recorded while paused is refused", async () => {
    const { a, t } = await setupSessionWorld();
    const sessionId = await startSession(a);
    await a.post("/api/v1/sessions/collection", {
      action: "pause",
      atMs: 1000,
      sessionId,
    });
    const audioStorageId = await storeUpload(t, wavBlob());

    const response = await a.post("/api/v1/sessions/segments", {
      audioStorageId,
      clientKey: "voice-1",
      endMs: 3000,
      sessionId,
      startMs: 2000,
    });
    expect(response).toEqual({
      body: { error: "Recorded while paused" },
      status: 409,
    });
  });

  test("a replayed voice passage keeps one segment and deletes the duplicate upload", async () => {
    const { a, t } = await setupSessionWorld();
    const sessionId = await startSession(a);
    const body = {
      clientKey: "voice-1",
      endMs: 3000,
      sessionId,
      startMs: 1000,
    };
    const firstUpload = await storeUpload(t, wavBlob());
    const duplicateUpload = await storeUpload(t, wavBlob());

    const first = segmentResponse.parse(
      (
        await a.post("/api/v1/sessions/segments", {
          ...body,
          audioStorageId: firstUpload,
        })
      ).body
    );
    const replay = segmentResponse.parse(
      (
        await a.post("/api/v1/sessions/segments", {
          ...body,
          audioStorageId: duplicateUpload,
        })
      ).body
    );

    expect(replay.segment.id).toBe(first.segment.id);
    expect(first.segment).toMatchObject({ hasAudio: true, source: "voice" });
    const stored = await t.run(async (ctx) => ({
      duplicate: await ctx.db.system.get(duplicateUpload),
      original: await ctx.db.system.get(firstUpload),
      segments: await ctx.db.query("sessionSegments").collect(),
    }));
    expect(stored.duplicate).toBeNull();
    expect(stored.original).not.toBeNull();
    expect(stored.segments).toHaveLength(1);
  });

  test("uploads must be fresh files of the right type and size", async () => {
    const { a, t } = await setupSessionWorld();
    const sessionId = await startSession(a);
    const register = async (
      clientKey: string,
      audioStorageId: Id<"_storage">
    ) =>
      await a.post("/api/v1/sessions/segments", {
        audioStorageId,
        clientKey,
        endMs: 2000,
        sessionId,
        startMs: 1000,
      });

    const image = await register("v-1", await storeUpload(t, pngBlob()));
    expect(image.status).toBe(400);
    const tooLarge = await register(
      "v-2",
      await storeUpload(t, wavBlob(SESSION_LIMITS.maxSegmentBytes + 1))
    );
    expect(tooLarge).toEqual({
      body: { error: "This session reached its bytes limit.", limit: "bytes" },
      status: 413,
    });
    const attached = await storeUpload(t, wavBlob());
    await register("v-3", attached);
    const reused = await register("v-4", attached);
    expect(errorBody.parse(reused.body).error).toBe("Upload not found");
  });

  test("segment and evidence limits answer 413 with the limit kind", async () => {
    const { a, t } = await setupSessionWorld();
    const sessionId = await startSession(a);
    await t.run(async (ctx) => {
      const id = ctx.db.normalizeId("sessions", sessionId);
      const session = id ? await ctx.db.get(id) : null;
      if (id && session) {
        await ctx.db.patch(id, {
          usage: {
            ...session.usage,
            evidenceCount: SESSION_LIMITS.maxEvidence,
            segmentCount: SESSION_LIMITS.maxSegments,
          },
        });
      }
    });

    const segment = await a.post("/api/v1/sessions/segments", {
      clientKey: "typed-1",
      endMs: 2000,
      sessionId,
      startMs: 1000,
      text: "One more thing",
    });
    expect(segment.status).toBe(413);
    expect(errorBody.parse(segment.body).limit).toBe("segments");
    const upload = await a.post("/api/v1/sessions/upload-url", {
      kind: "image",
      sessionId,
    });
    expect(errorBody.parse(upload.body).limit).toBe("evidence");
  });

  test("evidence registration is idempotent and keeps the screenshot", async () => {
    const { a, t } = await setupSessionWorld();
    const sessionId = await startSession(a);
    const uploadUrl = await a.post("/api/v1/sessions/upload-url", {
      kind: "image",
      sessionId,
    });
    expect(uploadUrl.status).toBe(200);
    const storageId = await storeUpload(t, pngBlob());
    const body = {
      atMs: 1200,
      clientKey: "evidence-1",
      frame: testFrame,
      image: { height: 400, storageId, width: 600 },
      sessionId,
      trigger: "mark",
    };

    const first = z
      .object({ evidence: sessionEvidenceSchema })
      .parse((await a.post("/api/v1/sessions/evidence", body)).body);
    const replay = z
      .object({ evidence: sessionEvidenceSchema })
      .parse((await a.post("/api/v1/sessions/evidence", body)).body);
    expect(replay.evidence.id).toBe(first.evidence.id);
    expect(first.evidence).toMatchObject({
      kind: "screenshot",
      status: "available",
    });
    expect(first.evidence.image?.url).toEqual(expect.any(String));
    expect((await sessionRow(t, sessionId))?.usage.evidenceCount).toBe(1);
  });

  test("correcting a segment makes the text human and flags the proposals citing it", async () => {
    const { a, t } = await setupSessionWorld();
    const sessionId = await startSession(a);
    const created = segmentResponse.parse(
      (
        await a.post("/api/v1/sessions/segments", {
          clientKey: "typed-1",
          endMs: 2000,
          sessionId,
          startMs: 1000,
          text: "The cart empties",
        })
      ).body
    );
    await a.post("/api/v1/sessions/proposals/create", {
      clientKey: "p-1",
      need: "Keep the cart",
      segmentIds: [created.segment.id],
      sessionId,
    });
    const revisionBefore =
      (await sessionRow(t, sessionId))?.transcriptRevision ?? 0;

    const corrected = segmentResponse.parse(
      (
        await a.post("/api/v1/sessions/segments/correct", {
          expectedRevision: created.segment.revision,
          segmentId: created.segment.id,
          text: "The cart empties after a reload",
        })
      ).body
    );
    expect(corrected.segment).toMatchObject({
      revision: created.segment.revision + 1,
      text: "The cart empties after a reload",
      textOrigin: "human",
    });
    expect((await sessionRow(t, sessionId))?.transcriptRevision).toBe(
      revisionBefore + 1
    );
    const proposals = await t.run((ctx) =>
      ctx.db.query("sessionProposals").collect()
    );
    expect(proposals[0]?.needsReview).toBe(true);

    const stale = await a.post("/api/v1/sessions/segments/correct", {
      expectedRevision: created.segment.revision,
      segmentId: created.segment.id,
      text: "Stale edit",
    });
    expect(stale.status).toBe(409);
  });
});
