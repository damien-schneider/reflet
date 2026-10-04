import { describe, expect, it } from "vitest";
import {
  generateSurveySetupPrompt,
  type SetupPromptSurvey,
} from "@/features/surveys/lib/generate-survey-setup-prompt";

const PUBLIC_KEY = "fb_pub_test";

const promptFor = (survey: Partial<SetupPromptSurvey>) =>
  generateSurveySetupPrompt({
    publicKey: PUBLIC_KEY,
    survey: {
      _id: "survey_abc",
      title: "Onboarding check-in",
      triggerType: "page_visit",
      ...survey,
    },
  });

describe("generateSurveySetupPrompt", () => {
  it("includes the survey id and both install paths with the public key", () => {
    const prompt = promptFor({});
    expect(prompt).toContain("SURVEY_ID=survey_abc");
    expect(prompt).toContain('<RefletProvider publicKey="fb_pub_test">');
    expect(prompt).toContain("<RefletSurveys />");
    expect(prompt).toContain('data-public-key="fb_pub_test"');
    expect(prompt).toContain("reflet-feedback.v1.js");
  });

  it("wires a manual survey with showSurvey for the script tag and the SDK", () => {
    const prompt = promptFor({ triggerType: "manual" });
    expect(prompt).toContain(
      'window.__refletFeedbackWidgetInstance?.showSurvey("survey_abc");'
    );
    expect(prompt).toContain("const { showSurvey } = useRefletSurveys();");
    expect(prompt).toContain('showSurvey("survey_abc");');
  });

  it("wires an event survey with track and its event name", () => {
    const prompt = promptFor({
      triggerConfig: { eventName: "checkout_completed" },
      triggerType: "event",
    });
    expect(prompt).toContain(
      'window.__refletFeedbackWidgetInstance?.track("checkout_completed");'
    );
    expect(prompt).toContain('track("checkout_completed");');
    expect(prompt).not.toContain("showSurvey(");
  });

  it("tells the agent no trigger code is needed for automatic triggers", () => {
    const prompt = promptFor({
      triggerConfig: { delayMs: 3000, pageUrl: "/pricing" },
      triggerType: "time_delay",
    });
    expect(prompt).toContain("no extra code is needed");
    expect(prompt).toContain("after the visitor spends 3 seconds");
    expect(prompt).toContain("`/pricing`");
    expect(prompt).not.toContain("useRefletSurveys");
  });
});
