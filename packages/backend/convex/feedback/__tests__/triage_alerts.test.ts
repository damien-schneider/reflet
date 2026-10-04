import { expect, test } from "vitest";
import { internal } from "../../_generated/api";
import {
  scheduledFunctionNames,
  seedFeedback,
  seedOrganization,
} from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const PLATFORM_ALERT = "email/renderer:sendPlatformAlertEmail";

test("the platform is emailed on the first triage failure and muted for the following ones", async () => {
  const t = setupTest();
  const feedbackId = await t.run(async (ctx) =>
    seedFeedback(ctx, await seedOrganization(ctx))
  );
  const failRun = async () => {
    const runId = await t.mutation(internal.feedback.triage_runs.start, {
      feedbackId,
      input: { description: "Clicking save loses the draft", title: "Draft" },
      tags: [],
    });
    await t.mutation(internal.feedback.triage_runs.fail, {
      error: "OPENROUTER_API_KEY is not set",
      runId,
    });
  };

  await failRun();
  await failRun();

  const names = await t.run((ctx) => scheduledFunctionNames(ctx));
  expect(names.filter((name) => name === PLATFORM_ALERT)).toHaveLength(1);
});
