/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.helpers";
import { createOrg } from "./test_helpers";

async function setup() {
  const t = convexTest(schema, modules);
  const victimOrgId = await createOrg(t);
  const attackerOrgId = await createOrg(t);
  const surveyId = await t.mutation(internal.admin_api.survey.createSurvey, {
    organizationId: victimOrgId,
    questions: [{ required: true, title: "How likely?", type: "nps" }],
    title: "Victim survey",
    triggerType: "manual",
  });
  return { attackerOrgId, surveyId, t, victimOrgId };
}

describe("admin survey API org scoping", () => {
  test("another organization's key cannot read the survey or its results", async () => {
    const { attackerOrgId, surveyId, t } = await setup();
    const asAttacker = { organizationId: attackerOrgId, surveyId };

    expect(
      await t.query(internal.admin_api.survey.getSurvey, asAttacker)
    ).toBeNull();
    await expect(
      t.query(internal.admin_api.survey_results.getAnalytics, asAttacker)
    ).rejects.toThrow("Survey not found");
    await expect(
      t.query(internal.admin_api.survey_results.listResponses, asAttacker)
    ).rejects.toThrow("Survey not found");
  });

  test("another organization's key cannot change, copy or delete the survey", async () => {
    const { attackerOrgId, surveyId, t, victimOrgId } = await setup();
    const asAttacker = { organizationId: attackerOrgId, surveyId };

    await expect(
      t.mutation(internal.admin_api.survey.updateSurvey, {
        ...asAttacker,
        title: "Hijacked",
      })
    ).rejects.toThrow("Survey not found");
    await expect(
      t.mutation(internal.admin_api.survey.updateSurveyStatus, {
        ...asAttacker,
        status: "closed",
      })
    ).rejects.toThrow("Survey not found");
    await expect(
      t.mutation(
        internal.admin_api.survey_lifecycle.duplicateSurvey,
        asAttacker
      )
    ).rejects.toThrow("Survey not found");
    await expect(
      t.mutation(internal.admin_api.survey_lifecycle.deleteSurvey, asAttacker)
    ).rejects.toThrow("Survey not found");

    const survey = await t.query(internal.admin_api.survey.getSurvey, {
      organizationId: victimOrgId,
      surveyId,
    });
    expect(survey).toMatchObject({ status: "draft", title: "Victim survey" });
    expect(survey?.questions).toHaveLength(1);
  });

  test("the owning organization still manages its survey", async () => {
    const { surveyId, t, victimOrgId } = await setup();
    const asOwner = { organizationId: victimOrgId, surveyId };

    await t.mutation(internal.admin_api.survey.updateSurvey, {
      ...asOwner,
      title: "Renamed",
    });
    await t.mutation(internal.admin_api.survey.updateSurveyStatus, {
      ...asOwner,
      status: "active",
    });
    expect(
      await t.query(internal.admin_api.survey.getSurvey, asOwner)
    ).toMatchObject({ status: "active", title: "Renamed" });

    await t.mutation(internal.admin_api.survey_lifecycle.deleteSurvey, asOwner);
    expect(
      await t.query(internal.admin_api.survey.getSurvey, asOwner)
    ).toBeNull();
  });
});

describe("admin survey API on the branching model", () => {
  test("creates from drafts with jumps and returns them with defaults applied", async () => {
    const t = convexTest(schema, modules);
    const organizationId = await createOrg(t);
    const surveyId = await t.mutation(internal.admin_api.survey.createSurvey, {
      endings: [{ id: "bye", title: "Bye" }],
      organizationId,
      questions: [
        {
          logic: [
            {
              id: "no",
              operator: "equals",
              target: { endingId: "bye", kind: "ending" },
              value: false,
            },
          ],
          required: true,
          title: "Did it work?",
          type: "boolean",
        },
        { required: false, title: "Tell us more", type: "text" },
      ],
      title: "Setup check",
      triggerType: "event",
    });

    const survey = await t.query(internal.admin_api.survey.getSurvey, {
      organizationId,
      surveyId,
    });

    expect(survey).toMatchObject({
      display: { frequency: "once" },
      endings: [{ id: "bye", title: "Bye" }],
      linkEnabled: false,
      triggerType: "event",
    });
    expect(survey?.questions[0]?.logic).toEqual([
      {
        id: "no",
        operator: "equals",
        target: { endingId: "bye", kind: "ending" },
        value: false,
      },
    ]);
  });

  test("refuses to activate a survey without questions", async () => {
    const t = convexTest(schema, modules);
    const organizationId = await createOrg(t);
    const surveyId = await t.mutation(internal.admin_api.survey.createSurvey, {
      organizationId,
      questions: [],
      title: "Empty",
      triggerType: "manual",
    });

    await expect(
      t.mutation(internal.admin_api.survey.updateSurveyStatus, {
        organizationId,
        status: "active",
        surveyId,
      })
    ).rejects.toThrow("Add at least one question.");
  });
});
