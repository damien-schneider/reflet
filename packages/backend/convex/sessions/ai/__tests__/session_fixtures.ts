import { vi } from "vitest";
import type { Doc, Id } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import { seedOrganization } from "../../../test.fixtures";

export const captureLogs = (): (() => string) => {
  const spies = (["error", "warn", "info", "log"] as const).map((level) =>
    vi.spyOn(console, level).mockImplementation(() => undefined)
  );
  return () => spies.flatMap((spy) => spy.mock.calls.flat()).join(" ");
};

export const SEED_AUTHOR_ID = "user-author";

const loaded = async <
  Table extends
    | "sessions"
    | "sessionSegments"
    | "sessionEvidence"
    | "sessionProposals",
>(
  ctx: MutationCtx,
  id: Id<Table>
): Promise<Doc<Table>> => {
  const doc = await ctx.db.get(id);
  if (!doc) {
    throw new Error(`Seeded document ${id} vanished`);
  }
  return doc;
};

export async function seedSession(
  ctx: MutationCtx,
  overrides: Partial<Doc<"sessions">> = {}
): Promise<Doc<"sessions">> {
  const organizationId = await seedOrganization(ctx);
  const now = Date.now();
  const id = await ctx.db.insert("sessions", {
    analysis: { state: "idle" },
    authorId: SEED_AUTHOR_ID,
    clientKey: `session-${now}`,
    collection: "ended",
    createdAt: now,
    endedAt: now,
    gaps: [],
    organizationId,
    startedAt: Date.UTC(2026, 9, 12, 14, 3),
    surface: "devtools",
    title: "Ostal settings walkthrough",
    transcriptRevision: 1,
    updatedAt: now,
    usage: { audioBytes: 0, eventCount: 0, evidenceCount: 0, segmentCount: 0 },
    visibility: "private",
    ...overrides,
  });
  return await loaded(ctx, id);
}

export async function seedSegment(
  ctx: MutationCtx,
  session: Doc<"sessions">,
  overrides: Partial<Doc<"sessionSegments">> = {}
): Promise<Doc<"sessionSegments">> {
  const now = Date.now();
  const id = await ctx.db.insert("sessionSegments", {
    clientKey: `segment-${Math.random()}`,
    createdAt: now,
    endMs: 4000,
    organizationId: session.organizationId,
    revision: 1,
    sessionId: session._id,
    source: "voice",
    startMs: 1000,
    text: "",
    textOrigin: "transcription",
    transcription: { attempts: 0, state: "done", updatedAt: now },
    updatedAt: now,
    ...overrides,
  });
  return await loaded(ctx, id);
}

export async function seedEvidence(
  ctx: MutationCtx,
  session: Doc<"sessions">,
  overrides: Partial<Doc<"sessionEvidence">> = {}
): Promise<Doc<"sessionEvidence">> {
  const id = await ctx.db.insert("sessionEvidence", {
    atMs: 0,
    clientKey: `evidence-${Math.random()}`,
    createdAt: Date.now(),
    kind: "screenshot",
    organizationId: session.organizationId,
    sessionId: session._id,
    status: "missing",
    trigger: "start",
    ...overrides,
  });
  return await loaded(ctx, id);
}

export async function seedProposal(
  ctx: MutationCtx,
  session: Doc<"sessions">,
  overrides: Partial<Doc<"sessionProposals">> = {}
): Promise<Doc<"sessionProposals">> {
  const now = Date.now();
  const id = await ctx.db.insert("sessionProposals", {
    basedOnTranscriptRevision: session.transcriptRevision,
    certainty: "clear",
    clarifications: [],
    createdAt: now,
    decision: "pending",
    evidenceIds: [],
    need: "Know that my changes are saved",
    needsReview: false,
    observed: "The author was unsure whether the form saved.",
    organizationId: session.organizationId,
    origin: "ai",
    revision: 1,
    segmentIds: [],
    sessionId: session._id,
    setAside: [],
    unknowns: [],
    updatedAt: now,
    ...overrides,
  });
  return await loaded(ctx, id);
}

export const settingsFrame = (scrollY = 0) => ({
  devicePixelRatio: 2,
  scrollX: 0,
  scrollY,
  title: "Settings",
  url: "http://localhost:3000/settings?token=secret",
  viewportHeight: 800,
  viewportWidth: 1280,
});

export const saveButton = (source: string | null = null) => ({
  component: "SettingsForm",
  label: "Enregistrer",
  rect: { height: 32, width: 120, x: 40, y: 300 },
  role: "button",
  selector: "form > button[type=submit]",
  source,
});
