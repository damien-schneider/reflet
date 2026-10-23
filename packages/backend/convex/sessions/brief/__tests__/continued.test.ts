/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../../../schema";
import { modules } from "../../../test.helpers";
import {
  seedEvidence,
  seedProposal,
  seedSegment,
  seedSession,
  settingsFrame,
} from "../../ai/__tests__/session_fixtures";
import { buildSessionBrief } from "../build";

const PREVIOUS_HANDOFF_AT = Date.UTC(2026, 9, 12, 15, 0);

async function seedContinuedHandoff() {
  const t = convexTest(schema, modules);
  return await t.run(async (ctx) => {
    const first = await seedSession(ctx);
    const wish = await seedSegment(ctx, first, {
      text: "Je ne sais pas si c'est enregistré.",
    });
    const intention = await seedProposal(ctx, first, {
      decision: "kept",
      need: "Être certain que mes modifications sont enregistrées",
      response: "Afficher « Enregistré » après la sauvegarde.",
      revision: 2,
      segmentIds: [wish._id],
      unknowns: ["Le serveur confirme-t-il la sauvegarde ?"],
    });
    const second = await seedSession(ctx, {
      organizationId: first.organizationId,
      startedAt: Date.UTC(2026, 9, 13, 9, 0),
      title: "Ostal follow-up",
    });
    const checked = await seedSegment(ctx, second, {
      endMs: 8000,
      startMs: 5000,
      text: "Maintenant je vois « Enregistré », c'est bon.",
    });
    const screenshot = await seedEvidence(ctx, second, {
      atMs: 6000,
      frame: settingsFrame(),
      image: {
        bytes: 1000,
        height: 800,
        storageId: await ctx.storage.store(new Blob(["png"])),
        width: 1280,
      },
      status: "available",
      trigger: "manual",
    });
    const contributionId = await ctx.db.insert("sessionContributions", {
      answers: [],
      applied: [
        {
          at: Date.UTC(2026, 9, 13, 9, 10),
          by: "user-author",
          changeIds: ["c1", "c2"],
          fields: [
            {
              after: "Afficher « Enregistré » après la sauvegarde.",
              before: "Afficher une confirmation claire.",
              field: "response",
            },
            {
              after: ["Le serveur confirme-t-il la sauvegarde ?"],
              before: [],
              field: "unknowns",
            },
          ],
          revision: 2,
        },
      ],
      baseRevision: 2,
      changes: [],
      createdAt: Date.now(),
      evidenceIds: [screenshot._id],
      intentionId: intention._id,
      organizationId: first.organizationId,
      origin: "continuation",
      segmentIds: [checked._id],
      sessionId: second._id,
      updatedAt: Date.now(),
    });
    const contribution = await ctx.db.get(contributionId);
    if (!contribution) {
      throw new Error("Contribution vanished");
    }
    const previous = await ctx.db.insert("sessionHandoffs", {
      authorId: "user-author",
      brief: "",
      clientKey: "handoff-1",
      createdAt: PREVIOUS_HANDOFF_AT,
      deliveries: [],
      evidenceIds: [],
      files: [],
      organizationId: first.organizationId,
      proposals: [
        {
          need: intention.need,
          proposalId: intention._id,
          response: "Afficher une confirmation claire.",
          revision: 1,
          unknowns: [],
        },
      ],
      sessionId: first._id,
    });
    const previousHandoff = await ctx.db.get(previous);
    if (!previousHandoff) {
      throw new Error("Handoff vanished");
    }
    return {
      brief: buildSessionBrief({
        authorName: "Damien",
        chosenEvidenceIds: [screenshot._id],
        continuedIn: [
          {
            events: [],
            evidence: [screenshot],
            segments: [checked],
            session: second,
            turns: [],
          },
        ],
        contributions: [contribution],
        home: {
          events: [],
          evidence: [],
          segments: [wish],
          session: first,
          turns: [],
        },
        organizationName: "Ostal",
        previousHandoffs: [previousHandoff],
        proposals: [intention],
      }),
      screenshotId: screenshot._id,
    };
  });
}

describe("buildSessionBrief across sessions", () => {
  test("quotes the later session that refined the intention, with what it changed", async () => {
    const { brief } = await seedContinuedHandoff();

    expect(brief.markdown).toContain(
      'Continued in session "Ostal follow-up" (recorded 2026-10-13 09:00 UTC), accepted into revision 2:\n- Considered response: "Afficher une confirmation claire." → "Afficher « Enregistré » après la sauvegarde."\n- Unknowns: added "Le serveur confirme-t-il la sauvegarde ?"'
    );
    expect(brief.markdown).toContain(
      "[00:05] Maintenant je vois « Enregistré », c'est bon."
    );
  });

  test("ships evidence from the later session under the same intention", async () => {
    const { brief, screenshotId } = await seedContinuedHandoff();

    expect(brief.files).toEqual([
      { evidenceId: screenshotId, name: "evidence/E1-0006.png" },
    ]);
    expect(brief.markdown).toContain(
      "Evidence:\n- E1 — screenshot at 00:06 on /settings — file evidence/E1-0006.png"
    );
    expect(brief.markdown).not.toContain("Other evidence the author selected");
  });

  test("tells the agent what changed since the previous brief of the same need", async () => {
    const { brief } = await seedContinuedHandoff();

    expect(brief.markdown).toContain(
      'Changed since the brief of 2026-10-12 15:00 UTC (revision 1 → 2):\n- Considered response was: "Afficher une confirmation claire."\n- Unknowns were: nothing'
    );
  });
});
