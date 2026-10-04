import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { describe, expect, it } from "vitest";
import {
  type SettingsSurvey,
  settingsIssues,
  settingsToUpdate,
  toSettingsDraft,
} from "@/features/surveys/lib/settings/settings-draft";

const SURVEY_ID = "survey_1" as Id<"surveys">;

const baseSurvey: SettingsSurvey = {
  _id: SURVEY_ID,
  description: "Post-checkout pulse",
  display: { frequency: "once", position: "bottom_right" },
  endsAt: 2_000_000,
  maxResponses: 50,
  startsAt: 1_000_000,
  title: "Checkout survey",
  triggerConfig: { eventName: "checkout_completed", sampleRate: 25 },
  triggerType: "event",
};

describe("settingsToUpdate", () => {
  it("round-trips an untouched survey without losing settings", () => {
    expect(
      settingsToUpdate(toSettingsDraft(baseSurvey), baseSurvey)
    ).toStrictEqual({
      description: "Post-checkout pulse",
      display: { frequency: "once", position: "bottom_right" },
      endsAt: 2_000_000,
      maxResponses: 50,
      startsAt: 1_000_000,
      surveyId: SURVEY_ID,
      title: "Checkout survey",
      triggerConfig: { eventName: "checkout_completed", sampleRate: 25 },
      triggerType: "event",
    });
  });

  it("sends null to clear the response cap and schedule dates", () => {
    const draft = {
      ...toSettingsDraft(baseSurvey),
      endsAt: null,
      maxResponses: "  ",
      startsAt: null,
    };
    expect(settingsToUpdate(draft, baseSurvey)).toMatchObject({
      endsAt: null,
      maxResponses: null,
      startsAt: null,
    });
  });

  it("keeps recontact days only for frequencies that show the survey again", () => {
    const draft = { ...toSettingsDraft(baseSurvey), recontactDays: "14" };
    expect(settingsToUpdate(draft, baseSurvey).display).toStrictEqual({
      frequency: "once",
      position: "bottom_right",
    });
    expect(
      settingsToUpdate({ ...draft, frequency: "recurring" }, baseSurvey).display
    ).toStrictEqual({
      frequency: "recurring",
      position: "bottom_right",
      recontactDays: 14,
    });
  });

  it("sends the event name only for event triggers and the delay only for time delays", () => {
    const draft = {
      ...toSettingsDraft(baseSurvey),
      delaySeconds: "2.5",
      pageUrl: " /pricing ",
      sampleRate: "100",
    };
    expect(settingsToUpdate(draft, baseSurvey).triggerConfig).toStrictEqual({
      eventName: "checkout_completed",
      pageUrl: "/pricing",
    });
    expect(
      settingsToUpdate({ ...draft, triggerType: "time_delay" }, baseSurvey)
        .triggerConfig
    ).toStrictEqual({ delayMs: 2500, pageUrl: "/pricing" });
  });

  it("drops the page filter for manual surveys, which ignore it", () => {
    const draft = {
      ...toSettingsDraft(baseSurvey),
      pageUrl: "/pricing",
      triggerType: "manual" as const,
    };
    expect(settingsToUpdate(draft, baseSurvey).triggerConfig).toStrictEqual({
      sampleRate: 25,
    });
  });
});

describe("settingsIssues", () => {
  it("accepts a survey loaded from the server", () => {
    expect(settingsIssues(toSettingsDraft(baseSurvey))).toStrictEqual({});
  });

  it("flags each invalid field with a message", () => {
    const draft = {
      ...toSettingsDraft(baseSurvey),
      endsAt: 1_000_000,
      eventName: " ",
      frequency: "until_completed" as const,
      maxResponses: "0",
      recontactDays: "1.5",
      sampleRate: "150",
      title: "",
    };
    expect(Object.keys(settingsIssues(draft)).sort()).toStrictEqual([
      "endsAt",
      "eventName",
      "maxResponses",
      "recontactDays",
      "sampleRate",
      "title",
    ]);
  });

  it("requires a non-negative delay for time-delay surveys", () => {
    const draft = {
      ...toSettingsDraft(baseSurvey),
      delaySeconds: "-1",
      triggerType: "time_delay" as const,
    };
    expect(settingsIssues(draft)).toHaveProperty("delaySeconds");
  });
});
