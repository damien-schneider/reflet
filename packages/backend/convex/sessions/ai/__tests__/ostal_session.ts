import type { TestContext } from "../../../test.helpers";
import {
  saveButton,
  seedEvidence,
  seedSegment,
  seedSession,
  settingsFrame,
} from "./session_fixtures";

export const WISH = "Il faudrait un historique.";
export const SAVED_NEED = "Savoir que mes modifications sont enregistrées";

export const proposalOutput = (need: string) => ({
  certainty: "clear",
  evidence: ["E1", "E9"],
  need,
  observed:
    "L'auteur a modifié une valeur, cliqué sur Enregistrer, puis dit vouloir savoir si c'est enregistré.",
  question: null,
  response: null,
  segments: ["S1", "S2", "S7"],
  setAside: ["Un historique des modifications"],
  unknowns: [],
});

export async function seedOstalSession(t: TestContext) {
  return await t.run(async (ctx) => {
    const session = await seedSession(ctx);
    const wish = await seedSegment(ctx, session, {
      endMs: 4000,
      startMs: 1000,
      text: WISH,
    });
    const correction = await seedSegment(ctx, session, {
      endMs: 13_000,
      startMs: 10_000,
      text: "En fait, je veux surtout savoir si c'est enregistré.",
    });
    const evidence = await seedEvidence(ctx, session, {
      atMs: 9000,
      element: saveButton(),
      frame: settingsFrame(),
      trigger: "select",
    });
    return {
      correctionId: correction._id,
      evidenceId: evidence._id,
      sessionId: session._id,
      wishId: wish._id,
    };
  });
}
