import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnalyticsDashboard } from "@/features/surveys/components/analytics/analytics-dashboard";
import type {
  QuestionStat,
  SurveyAnalytics,
} from "@/features/surveys/components/analytics/analytics-summary";

const analyticsResult: { current: SurveyAnalytics | undefined } = vi.hoisted(
  () => ({ current: undefined })
);

vi.mock("convex/react", () => ({
  useQuery: () => analyticsResult.current,
}));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

const questionId = (id: string) => id as Id<"surveyQuestions">;

const step = (
  overrides: Pick<QuestionStat, "questionId" | "title" | "type" | "order"> &
    Partial<QuestionStat>
): QuestionStat => ({ answered: 0, dropOffs: 0, reached: 0, ...overrides });

const analytics: SurveyAnalytics = {
  abandonedResponses: 12,
  completedResponses: 28,
  completionRate: 70,
  endings: [{ count: 28, endingId: "default", title: "Thank you!" }],
  inProgressResponses: 0,
  medianCompletionMs: 72_000,
  nps: {
    detractors: 4,
    passives: 6,
    promoters: 18,
    questionId: questionId("q-nps"),
    score: 50,
    total: 28,
  },
  questionStats: [
    step({
      answered: 36,
      distribution: Array.from({ length: 11 }, (_, point) => ({
        count: point >= 9 ? 9 : 1,
        label: String(point),
      })),
      dropOffs: 4,
      order: 0,
      questionId: questionId("q-nps"),
      reached: 40,
      title: "How likely are you to recommend us?",
      type: "nps",
    }),
    step({
      answered: 28,
      dropOffs: 8,
      order: 1,
      questionId: questionId("q-why"),
      reached: 36,
      recentTextAnswers: [],
      title: "What should we improve?",
      type: "text",
    }),
  ],
  responsesByDay: [{ completed: 28, date: "2026-10-04", started: 40 }],
  sampledResponses: null,
  totalResponses: 40,
};

describe("AnalyticsDashboard", () => {
  it("shows the NPS score and highlights the step that loses the most people", () => {
    analyticsResult.current = analytics;

    render(<AnalyticsDashboard surveyId={"survey-1" as Id<"surveys">} />);

    expect(screen.getByText("50")).toBeInTheDocument();
    expect(
      screen.getByText("Most people leave at “What should we improve?”.")
    ).toBeInTheDocument();

    const funnel = screen.getByRole("list", { name: "Drop-off by question" });
    const worstStep = within(funnel)
      .getByText("Biggest drop-off")
      .closest("li");
    expect(worstStep).toHaveTextContent("What should we improve?");
    expect(worstStep).toHaveTextContent("8 left (22%)");
  });

  it("explains how to collect responses when there are none", () => {
    analyticsResult.current = {
      ...analytics,
      nps: null,
      questionStats: [],
      totalResponses: 0,
    };

    render(<AnalyticsDashboard surveyId={"survey-1" as Id<"surveys">} />);

    expect(screen.getByText("No responses yet")).toBeInTheDocument();
  });
});
