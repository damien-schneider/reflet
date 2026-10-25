/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { z } from "zod";
import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import {
  MEMBER_A,
  MEMBER_B,
  seedSession,
  setupSessionWorld,
  testFrame,
} from "./session.fixtures";

const LIVE = "/api/v1/sessions/live";

const liveResponse = z.object({
  entries: z.array(
    z.object({
      atMs: z.number(),
      endMs: z.number(),
      id: z.string(),
      lines: z.array(z.string()),
      screenshotIds: z.array(z.string()),
    })
  ),
  screenshots: z.array(z.object({ id: z.string(), url: z.string() })),
  session: z.object({
    collection: z.string(),
    id: z.string(),
    startedAt: z.number(),
    title: z.string(),
  }),
  transcription: z.object({
    oldestRunningMs: z.number().nullable(),
    running: z.number(),
  }),
});

const feedOf = (sessionId: string, sinceMs: number | string = 0) =>
  `${LIVE}?sessionId=${sessionId}&sinceMs=${sinceMs}`;

const saveButton = {
  component: "CheckoutForm",
  label: 'button "Save"',
  rect: { height: 32, width: 96, x: 40, y: 400 },
  role: "button",
  selector: "form > button.save",
  source: "src/checkout/form.tsx:42:7",
};

const passage = (
  ctx: MutationCtx,
  session: Pick<Doc<"sessions">, "_id" | "organizationId">,
  fields: Pick<Doc<"sessionSegments">, "endMs" | "startMs" | "text"> & {
    state: Doc<"sessionSegments">["transcription"]["state"];
  }
) =>
  ctx.db.insert("sessionSegments", {
    clientKey: `segment-${fields.startMs}`,
    createdAt: Date.now(),
    endMs: fields.endMs,
    organizationId: session.organizationId,
    revision: 1,
    sessionId: session._id,
    source: "voice",
    startMs: fields.startMs,
    text: fields.text,
    textOrigin: "transcription",
    transcription: { attempts: 1, state: fields.state, updatedAt: Date.now() },
    updatedAt: Date.now(),
  });

async function seedRecordingWithPassages() {
  const world = await setupSessionWorld();
  const ids = await world.t.run(async (ctx) => {
    const sessionId = await seedSession(ctx, {
      authorId: MEMBER_A.userId,
      collection: "recording",
      organizationId: world.organizationId,
      surface: "live",
    });
    const session = { _id: sessionId, organizationId: world.organizationId };
    await passage(ctx, session, {
      endMs: 13_000,
      startMs: 10_000,
      state: "done",
      text: "Here I never know if it's saved.",
    });
    await passage(ctx, session, {
      endMs: 52_000,
      startMs: 50_000,
      state: "running",
      text: "",
    });
    await passage(ctx, session, {
      endMs: 62_000,
      startMs: 60_000,
      state: "failed",
      text: "",
    });
    await ctx.db.insert("sessionEventBatches", {
      clientKey: "events-1",
      createdAt: Date.now(),
      endMs: 40_000,
      events: [
        {
          atMs: 11_000,
          element: saveButton,
          frame: testFrame,
          kind: "click",
          pointer: { x: 60, y: 410 },
        },
        {
          atMs: 40_000,
          element: saveButton,
          evidenceClientKey: "shot-select",
          frame: testFrame,
          kind: "select",
          note: "Say Saved once it is stored",
        },
      ],
      organizationId: world.organizationId,
      sessionId,
      startMs: 11_000,
    });
    await passage(ctx, session, {
      endMs: 203_000,
      startMs: 200_000,
      state: "done",
      text: "Keep the folder I picked.",
    });
    await ctx.db.insert("sessionEventBatches", {
      clientKey: "events-2",
      createdAt: Date.now(),
      endMs: 201_000,
      events: [
        {
          atMs: 201_000,
          element: saveButton,
          frame: testFrame,
          kind: "click",
          pointer: { x: 60, y: 410 },
        },
      ],
      organizationId: world.organizationId,
      sessionId,
      startMs: 150_000,
    });
    const screenshotId = await ctx.db.insert("sessionEvidence", {
      atMs: 40_000,
      capturedAtMs: 40_200,
      clientKey: "shot-select",
      createdAt: Date.now(),
      element: saveButton,
      frame: testFrame,
      image: {
        bytes: 3,
        height: 800,
        storageId: await ctx.storage.store(new Blob(["png"])),
        width: 1200,
      },
      kind: "screenshot",
      note: "Say Saved once it is stored",
      organizationId: world.organizationId,
      sessionId,
      status: "available",
      trigger: "select",
    });
    return { screenshotId, sessionId };
  });
  return { ...world, ...ids };
}

describe("live session feed", () => {
  test("hands over what was said and typed, with where it happened", async () => {
    const world = await seedRecordingWithPassages();

    const response = await world.a.get(feedOf(world.sessionId));

    expect(response.status).toBe(200);
    const live = liveResponse.parse(response.body);
    expect(live.session).toMatchObject({
      collection: "recording",
      id: world.sessionId,
    });
    expect(live.entries.map(({ lines }) => lines)).toEqual([
      [
        "[00:10] Here I never know if it's saved.",
        expect.stringContaining(
          'clicked button "Save" in <CheckoutForm> at 00:11 on /checkout (selector: form > button.save, source: src/checkout/form.tsx:42:7)'
        ),
      ],
      [
        "[00:40] Note: Say Saved once it is stored",
        expect.stringContaining(
          `pointed at button "Save" in <CheckoutForm> at 00:40 on /checkout (${world.screenshotId})`
        ),
      ],
      [expect.stringContaining("(this passage could not be transcribed)")],
      [
        "[03:20] Keep the folder I picked.",
        expect.stringContaining('clicked button "Save"'),
      ],
    ]);
    expect(live.entries[1]).toMatchObject({
      atMs: 40_000,
      endMs: 40_000,
      screenshotIds: [world.screenshotId],
    });
    expect(live.entries[0]).toMatchObject({ atMs: 10_000, endMs: 13_000 });
    expect(live.screenshots).toEqual([
      { id: world.screenshotId, url: expect.any(String) },
    ]);
    expect(live.transcription).toEqual({ oldestRunningMs: 50_000, running: 1 });
  });

  test("sinceMs returns only later passages, with clicks from just before", async () => {
    const world = await seedRecordingWithPassages();

    const live = liveResponse.parse(
      (await world.a.get(feedOf(world.sessionId, 200_000))).body
    );

    expect(live.entries.map(({ lines }) => lines)).toEqual([
      [
        "[03:20] Keep the folder I picked.",
        expect.stringContaining('clicked button "Save"'),
      ],
    ]);
    expect(live.screenshots).toEqual([]);
    expect(live.transcription).toEqual({ oldestRunningMs: null, running: 0 });
  });

  test("rejects a sinceMs that is not whole milliseconds", async () => {
    const world = await seedRecordingWithPassages();

    for (const sinceMs of ["1.5", "-1", "soon"]) {
      expect((await world.a.get(feedOf(world.sessionId, sinceMs))).status).toBe(
        400
      );
    }
  });

  test("only the author's own live sessions can be followed", async () => {
    const world = await setupSessionWorld();
    const ids = await world.t.run(async (ctx) => ({
      devtools: await seedSession(ctx, {
        authorId: MEMBER_A.userId,
        collection: "recording",
        organizationId: world.organizationId,
      }),
      othersLive: await seedSession(ctx, {
        authorId: MEMBER_B.userId,
        collection: "recording",
        organizationId: world.organizationId,
        surface: "live",
        visibility: "team",
      }),
    }));

    expect((await world.a.get(feedOf(ids.devtools))).status).toBe(404);
    expect((await world.a.get(feedOf(ids.othersLive))).status).toBe(404);
  });
});
