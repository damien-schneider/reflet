import { z } from "zod";
import { sessionDetailSchema } from "../../../../../sdk/src/sessions/protocol";
import type { Doc, Id } from "../../../_generated/dataModel";
import type { TestContext } from "../../../test.helpers";
import {
  MEMBER_A,
  type SessionClient,
  seedProposal,
  seedSession,
  setupSessionWorld,
  testFrame,
} from "../../__tests__/session.fixtures";

export const SAVED_NEED = "Savoir que mes modifications sont enregistrées";
export const FIRST_RESPONSE =
  "Afficher une confirmation après l'enregistrement.";

export type PendingChange = Omit<
  Doc<"sessionContributions">["changes"][number],
  "decision" | "evidenceIds" | "segmentIds"
>;

export interface IntentionWorld {
  a: SessionClient;
  b: SessionClient;
  intentionId: Id<"sessionProposals">;
  organizationId: Id<"organizations">;
  outsider: SessionClient;
  sessionId: Id<"sessions">;
  t: TestContext;
}

export async function setupIntentionWorld(
  options: { visibility?: "private" | "team" } = {}
): Promise<IntentionWorld> {
  const world = await setupSessionWorld();
  const seeded = await world.t.run(async (ctx) => {
    const sessionId = await seedSession(ctx, {
      authorId: MEMBER_A.userId,
      organizationId: world.organizationId,
      title: "Ostal settings walkthrough",
      visibility: options.visibility ?? "private",
    });
    const segmentId = await ctx.db.insert("sessionSegments", {
      clientKey: "segment-a-1",
      createdAt: Date.now(),
      endMs: 4000,
      organizationId: world.organizationId,
      revision: 1,
      sessionId,
      source: "voice",
      startMs: 1000,
      text: "Ici, je ne sais pas si c'est enregistré.",
      textOrigin: "transcription",
      transcription: { attempts: 0, state: "done", updatedAt: Date.now() },
      updatedAt: Date.now(),
    });
    const intentionId = await seedProposal(
      ctx,
      { _id: sessionId, organizationId: world.organizationId },
      {
        decision: "kept",
        need: SAVED_NEED,
        response: FIRST_RESPONSE,
        revision: 2,
        segmentIds: [segmentId],
      }
    );
    return { intentionId, sessionId };
  });
  return { ...world, ...seeded };
}

export async function startContinuation(
  client: SessionClient,
  continues: { intentionId: string; revision: number },
  clientKey = "session-b"
): Promise<string> {
  const started = await client.post("/api/v1/sessions/start", {
    clientKey,
    continues,
    page: { title: "Settings", url: testFrame.url },
    startedAt: Date.now(),
    surface: "devtools",
  });
  return z.object({ session: z.object({ id: z.string() }) }).parse(started.body)
    .session.id;
}

export async function loadDetail(client: SessionClient, sessionId: string) {
  const response = await client.get(
    `/api/v1/sessions/detail?sessionId=${sessionId}`
  );
  return sessionDetailSchema.parse(response.body);
}

export async function findContribution(
  t: TestContext,
  sessionId: string
): Promise<Doc<"sessionContributions">> {
  const contribution = await t.run(async (ctx) => {
    const all = await ctx.db.query("sessionContributions").collect();
    return all.find((item) => item.sessionId === sessionId) ?? null;
  });
  if (!contribution) {
    throw new Error(`No contribution for session ${sessionId}`);
  }
  return contribution;
}

export async function seedSpokenPassage(
  t: TestContext,
  options: { sessionId: Id<"sessions">; startMs: number; text: string }
): Promise<Id<"sessionSegments">> {
  return await t.run(async (ctx) => {
    const session = await ctx.db.get(options.sessionId);
    if (!session) {
      throw new Error("Session missing");
    }
    return await ctx.db.insert("sessionSegments", {
      clientKey: `segment-${options.startMs}`,
      createdAt: Date.now(),
      endMs: options.startMs + 3000,
      organizationId: session.organizationId,
      revision: 1,
      sessionId: session._id,
      source: "voice",
      startMs: options.startMs,
      text: options.text,
      textOrigin: "transcription",
      transcription: { attempts: 0, state: "done", updatedAt: Date.now() },
      updatedAt: Date.now(),
    });
  });
}

export async function seedPendingChanges(
  t: TestContext,
  options: {
    changes: PendingChange[];
    contributionId: Id<"sessionContributions">;
    evidenceIds?: Id<"sessionEvidence">[];
    segmentId: Id<"sessionSegments">;
  }
): Promise<void> {
  await t.run((ctx) =>
    ctx.db.patch(options.contributionId, {
      changes: options.changes.map((change) => ({
        ...change,
        decision: "pending" as const,
        evidenceIds: options.evidenceIds ?? [],
        segmentIds: [options.segmentId],
      })),
    })
  );
}

export const precision: PendingChange = {
  field: "unknowns",
  hypothesis: false,
  id: "change-precision",
  kind: "precision",
  operation: "add",
  reason: "The author asked whether the server confirms the save.",
  value: "Le serveur confirme-t-il la sauvegarde ?",
};

export const solutionChange: PendingChange = {
  field: "response",
  hypothesis: true,
  id: "change-solution",
  kind: "solution",
  operation: "replace",
  reason: "The author mentioned a toast.",
  value: "Afficher un toast.",
};
