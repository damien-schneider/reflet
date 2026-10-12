import { z } from "zod";
import { sessionSummarySchema } from "../../../../sdk/src/sessions/protocol";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { hashSecretKey } from "../../feedback/api_auth";
import { seedOrganization } from "../../test.fixtures";
import { setupTest, type TestContext } from "../../test.helpers";

export const MEMBER_A = { token: `fb_dev_${"a".repeat(64)}`, userId: "user-a" };
export const MEMBER_B = { token: `fb_dev_${"b".repeat(64)}`, userId: "user-b" };
export const OUTSIDER = { token: `fb_dev_${"c".repeat(64)}`, userId: "user-c" };

export interface SessionResponse {
  body: unknown;
  status: number;
}

export interface SessionClient {
  get: (path: string) => Promise<SessionResponse>;
  post: (path: string, body: unknown) => Promise<SessionResponse>;
}

export function sessionClient(t: TestContext, token: string): SessionClient {
  const call = async (
    path: string,
    init: RequestInit
  ): Promise<SessionResponse> => {
    const response = await t.fetch(path, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return { body: await response.json(), status: response.status };
  };
  return {
    get: (path) => call(path, { method: "GET" }),
    post: (path, body) =>
      call(path, { body: JSON.stringify(body), method: "POST" }),
  };
}

export async function setupSessionWorld() {
  const t = setupTest({
    authUsers: [
      { _id: MEMBER_A.userId, email: "ada@acme.test", name: "Ada" },
      { _id: MEMBER_B.userId, email: "bob@acme.test", name: "Bob" },
    ],
  });
  const organizationId = await t.run(async (ctx) => {
    const acme = await seedOrganization(ctx, { isPublic: false });
    const globex = await seedOrganization(ctx, {
      name: "Globex",
      slug: "globex",
    });
    await seedMemberWithDevtoolsToken(ctx, {
      ...MEMBER_A,
      organizationId: acme,
    });
    await seedMemberWithDevtoolsToken(ctx, {
      ...MEMBER_B,
      organizationId: acme,
    });
    await seedMemberWithDevtoolsToken(ctx, {
      ...OUTSIDER,
      organizationId: globex,
    });
    return acme;
  });
  return {
    a: sessionClient(t, MEMBER_A.token),
    b: sessionClient(t, MEMBER_B.token),
    organizationId,
    outsider: sessionClient(t, OUTSIDER.token),
    t,
  };
}

// convex-test drops the Blob type that production records from the upload's Content-Type.
export function storeUpload(
  t: TestContext,
  blob: Blob
): Promise<Id<"_storage">> {
  return t.run(async (ctx) => {
    const storageId = await ctx.storage.store(blob);
    const patchSystemRow: (
      id: Id<"_storage">,
      value: { contentType: string }
    ) => Promise<void> = Reflect.get(ctx.db, "patch").bind(ctx.db);
    await patchSystemRow(storageId, { contentType: blob.type });
    return storageId;
  });
}

export const wavBlob = (bytes = 64) =>
  new Blob([new Uint8Array(bytes)], { type: "audio/wav" });

export const pngBlob = (bytes = 64) =>
  new Blob([new Uint8Array(bytes)], { type: "image/png" });

export const testFrame = {
  devicePixelRatio: 2,
  scrollX: 0,
  scrollY: 0,
  title: "Checkout",
  url: "https://app.acme.test/checkout",
  viewportHeight: 800,
  viewportWidth: 1200,
};

export const errorBody = z.object({
  error: z.string(),
  limit: z.string().optional(),
});

export async function startSession(
  client: SessionClient,
  clientKey = "session-1"
): Promise<string> {
  const started = await client.post("/api/v1/sessions/start", {
    clientKey,
    page: { title: "Checkout", url: testFrame.url },
    startedAt: Date.now(),
    surface: "devtools",
  });
  return z.object({ session: sessionSummarySchema }).parse(started.body).session
    .id;
}

export async function seedMemberWithDevtoolsToken(
  ctx: MutationCtx,
  member: { organizationId: Id<"organizations">; token: string; userId: string }
): Promise<void> {
  const now = Date.now();
  await ctx.db.insert("organizationMembers", {
    createdAt: now,
    organizationId: member.organizationId,
    role: "member",
    userId: member.userId,
  });
  await ctx.db.insert("devtoolsTokens", {
    createdAt: now,
    label: "localhost:3000",
    lastUsedAt: now,
    organizationId: member.organizationId,
    tokenHash: await hashSecretKey(member.token),
    userId: member.userId,
  });
}

export async function seedSession(
  ctx: MutationCtx,
  overrides: Partial<Doc<"sessions">> & {
    authorId: string;
    organizationId: Id<"organizations">;
  }
): Promise<Id<"sessions">> {
  const now = Date.now();
  return await ctx.db.insert("sessions", {
    analysis: { state: "idle" },
    clientKey: `session-${now}-${Math.random()}`,
    collection: "ended",
    createdAt: now,
    gaps: [],
    startedAt: now,
    surface: "devtools",
    title: "Checkout walkthrough",
    transcriptRevision: 0,
    updatedAt: now,
    usage: { audioBytes: 0, eventCount: 0, evidenceCount: 0, segmentCount: 0 },
    visibility: "private",
    ...overrides,
  });
}

export async function seedProposal(
  ctx: MutationCtx,
  session: { _id: Id<"sessions">; organizationId: Id<"organizations"> },
  overrides: Partial<Doc<"sessionProposals">> = {}
): Promise<Id<"sessionProposals">> {
  const now = Date.now();
  return await ctx.db.insert("sessionProposals", {
    basedOnTranscriptRevision: 0,
    certainty: "clear",
    clarifications: [],
    createdAt: now,
    decision: "pending",
    evidenceIds: [],
    need: "Let me save the cart for later",
    needsReview: false,
    observed: "The author said the cart empties on reload.",
    organizationId: session.organizationId,
    origin: "ai",
    revision: 0,
    segmentIds: [],
    sessionId: session._id,
    setAside: [],
    unknowns: [],
    updatedAt: now,
    ...overrides,
  });
}
