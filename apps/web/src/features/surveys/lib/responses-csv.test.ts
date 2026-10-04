import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { describe, expect, it } from "vitest";
import {
  type ResponsesExport,
  responsesToCsv,
} from "@/features/surveys/lib/responses-csv";

const questionId = (id: string) => id as Id<"surveyQuestions">;
const responseId = (id: string) => id as Id<"surveyResponses">;

const STARTED_AT = Date.UTC(2026, 8, 1, 10, 0, 0);
const COMPLETED_AT = Date.UTC(2026, 8, 1, 10, 2, 30);

const exportResult: ResponsesExport = {
  questions: [
    {
      _id: questionId("q-feature"),
      title: "Which features?",
      type: "multiple_choice",
    },
    { _id: questionId("q-recommend"), title: "Recommend?", type: "boolean" },
    { _id: questionId("q-why-1"), title: "Why?", type: "text" },
    { _id: questionId("q-why-2"), title: "Why?", type: "text" },
    { _id: questionId("q-status"), title: "Status", type: "text" },
  ],
  rows: [
    {
      answers: {
        "q-feature": ["Boards", "Roadmap"],
        "q-recommend": true,
        "q-why-1": 'Fast, "simple"\nand calm',
      },
      channel: "link",
      completedAt: COMPLETED_AT,
      endingId: "default",
      respondentEmail: "ada@example.com",
      respondentName: "Ada, L.",
      responseId: responseId("r-1"),
      startedAt: STARTED_AT,
      status: "completed",
    },
    {
      answers: { "q-recommend": false },
      channel: "in_app",
      responseId: responseId("r-2"),
      startedAt: STARTED_AT,
      status: "abandoned",
    },
  ],
  truncated: false,
};

const parseLines = (csv: string) => csv.split("\r\n");

describe("responsesToCsv", () => {
  it("titles question columns and disambiguates duplicate titles", () => {
    const [header] = parseLines(responsesToCsv(exportResult));

    expect(header).toBe(
      "Response ID,Status,Channel,Started at,Completed at,Ending,Page URL,Respondent ID,Respondent name,Respondent email,Which features?,Recommend?,Why?,Why? (2),Status (2)"
    );
  });

  it("quotes commas, quotes and newlines and formats answers by type", () => {
    const csv = responsesToCsv(
      exportResult,
      new Map([["default", "Thank you!"]])
    );

    expect(csv).toContain(
      `r-1,Completed,Link,2026-09-01T10:00:00.000Z,2026-09-01T10:02:30.000Z,Thank you!,,,"Ada, L.",ada@example.com,Boards; Roadmap,Yes,"Fast, ""simple""\nand calm",,`
    );
  });

  it("leaves missing answers and optional fields empty", () => {
    const lines = parseLines(responsesToCsv(exportResult));

    expect(lines.at(-1)).toBe(
      "r-2,Abandoned,In app,2026-09-01T10:00:00.000Z,,,,,,,,No,,,"
    );
  });

  it("keeps respondent text that looks like a spreadsheet formula inert", () => {
    const [, row] = parseLines(
      responsesToCsv({
        questions: [{ _id: questionId("q-why"), title: "Why?", type: "text" }],
        rows: [
          {
            answers: { "q-why": '=HYPERLINK("https://evil.test","Click")' },
            channel: "link",
            respondentId: "@SUM(A1)",
            responseId: responseId("r-3"),
            startedAt: STARTED_AT,
            status: "in_progress",
          },
        ],
        truncated: false,
      })
    );

    expect(row).toContain(",'@SUM(A1),");
    expect(row).toMatch(
      /,"'=HYPERLINK\(""https:\/\/evil\.test"",""Click""\)"$/
    );
  });
});
