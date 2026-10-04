import type { PublicSurvey } from "@reflet/survey-core";
import type { SurveyTransport } from "@reflet/survey-core/client";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { SurveyCard } from "../card/survey-card";
import { useSurveySession } from "../use-survey-session";
import { npsSurvey, question, recordingTransport, survey } from "./fixtures";

afterEach(cleanup);

function Harness({
  survey: subject,
  transport,
}: {
  survey: PublicSurvey;
  transport: SurveyTransport;
}) {
  const session = useSurveySession(subject, { transport });
  return <SurveyCard session={session} />;
}

const renderSurvey = (subject: PublicSurvey) => {
  const transport = recordingTransport();
  render(<Harness survey={subject} transport={transport} />);
  return transport;
};

test("a promoter score branches to its follow-up and ends on the promoter ending", async () => {
  const transport = renderSurvey(npsSurvey());

  fireEvent.click(await screen.findByRole("button", { name: "9" }));
  expect(
    await screen.findByRole("heading", { name: "What do you love most?" })
  ).toBeDefined();

  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "The speed" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Submit" }));

  expect(
    await screen.findByRole("heading", { name: "Thanks for the love!" })
  ).toBeDefined();
  expect(transport.answer.mock.calls.map(([call]) => call.value)).toEqual([
    9,
    "The speed",
  ]);
  expect(transport.complete).toHaveBeenCalledWith({
    responseId: "response-1",
  });
});

test("Back returns to the question the respondent came from, answer kept", async () => {
  renderSurvey(npsSurvey());

  fireEvent.click(await screen.findByRole("button", { name: "3" }));
  await screen.findByRole("heading", { name: "What went wrong?" });
  fireEvent.click(screen.getByRole("button", { name: "Back" }));

  expect(
    await screen.findByRole("heading", {
      name: "How likely are you to recommend us?",
    })
  ).toBeDefined();
  expect(
    screen.getByRole("button", { name: "3" }).getAttribute("aria-pressed")
  ).toBe("true");
});

test("the text typed for Other is the answer that gets submitted", async () => {
  const transport = renderSurvey(
    survey({
      questions: [
        question("channel", 0, {
          config: { allowOther: true, choices: ["Search", "A friend"] },
          required: true,
          title: "How did you hear about us?",
          type: "single_choice",
        }),
      ],
    })
  );

  fireEvent.click(await screen.findByRole("button", { name: "Other" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Other answer" }), {
    target: { value: "A podcast" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Submit" }));

  await screen.findByRole("heading", { name: "Thanks!" });
  expect(transport.answer).toHaveBeenCalledWith({
    questionId: "channel",
    responseId: "response-1",
    value: "A podcast",
  });
});

test("statement and ending buttons with a URL open that URL", async () => {
  document.addEventListener("click", (event) => event.preventDefault(), {
    once: true,
  });
  renderSurvey(
    survey({
      endings: [
        {
          buttonLabel: "See what's new",
          buttonUrl: "https://example.com/changelog",
          id: "thanks",
          title: "Thanks!",
        },
      ],
      questions: [
        question("intro", 0, {
          config: {
            buttonLabel: "Read the guide",
            buttonUrl: "https://example.com/guide",
          },
          title: "We shipped dark mode",
          type: "statement",
        }),
      ],
    })
  );

  const guide = await screen.findByRole("link", { name: "Read the guide" });
  expect(guide.getAttribute("href")).toBe("https://example.com/guide");
  expect(guide.getAttribute("target")).toBe("_blank");

  fireEvent.click(guide);

  const changelog = await screen.findByRole("link", { name: "See what's new" });
  expect(changelog.getAttribute("href")).toBe("https://example.com/changelog");
});

test("a javascript: button URL renders a plain button, not a link", async () => {
  renderSurvey(
    survey({
      questions: [
        question("intro", 0, {
          config: {
            buttonLabel: "Claim reward",
            buttonUrl: "javascript:alert(document.cookie)",
          },
          title: "You unlocked a reward",
          type: "statement",
        }),
      ],
    })
  );

  expect(
    await screen.findByRole("button", { name: "Claim reward" })
  ).toBeDefined();
  expect(screen.queryByRole("link")).toBeNull();
});
