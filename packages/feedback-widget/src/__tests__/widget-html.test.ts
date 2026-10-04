import { describe, expect, it } from "vitest";
import { renderQuestionInput } from "../survey/inputs";
import type { FeedbackItem, WidgetConfig, WidgetState } from "../types";
import { renderWidgetHTML } from "../widget-html";

const BREAKOUT = `x" onmouseover="alert(1)" data-x='y`;

const config: WidgetConfig = {
  features: { voting: true },
  mode: "inline",
  publicKey: "fb_pub_test",
};

function feedbackItem(overrides: Partial<FeedbackItem>): FeedbackItem {
  return {
    author: null,
    boardStatus: null,
    commentCount: 0,
    createdAt: Date.now(),
    description: "",
    hasVoted: false,
    id: "fb_1",
    isPinned: false,
    status: "open",
    tags: [],
    title: "Title",
    voteCount: 0,
    ...overrides,
  };
}

function listState(items: FeedbackItem[]): WidgetState {
  return {
    boardConfig: null,
    error: null,
    feedbackItems: items,
    isLoading: false,
    isOpen: true,
    selectedFeedback: null,
    selectedFeedbackComments: [],
    view: "list",
  };
}

function mount(html: string): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = html;
  return root;
}

function injectedHandlers(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll("*")).flatMap((element) =>
    element
      .getAttributeNames()
      .filter((name) => name.startsWith("on") || name === "data-x")
  );
}

describe("feedback widget rendering", () => {
  it("keeps a quote-breaking feedback title inside its attribute", () => {
    const root = mount(
      renderWidgetHTML(listState([feedbackItem({ title: BREAKOUT })]), config)
    );
    expect(injectedHandlers(root)).toEqual([]);
    expect(
      root.querySelector(".reflet-feedback-open")?.getAttribute("aria-label")
    ).toBe(BREAKOUT);
    expect(root.querySelector(".reflet-feedback-title")?.textContent).toBe(
      BREAKOUT
    );
  });

  it("drops tag and status colours that could escape the style attribute", () => {
    const hostile = `red" onmouseover="alert(1)`;
    const root = mount(
      renderWidgetHTML(
        listState([
          feedbackItem({
            boardStatus: { color: hostile, id: "s", name: "Planned" },
            tags: [
              {
                color: "red; background: url(//evil.tld)",
                id: "t1",
                name: "a",
              },
              { color: "#3b82f6", id: "t2", name: "b" },
              { color: "blue", id: "t3", name: "c" },
            ],
          }),
        ]),
        config
      )
    );
    expect(injectedHandlers(root)).toEqual([]);
    const chipColors = Array.from(
      root.querySelectorAll<HTMLElement>(".reflet-feedback-status, .reflet-tag")
    ).map((chip) => chip.style.getPropertyValue("--reflet-chip-color").trim());
    expect(chipColors).toEqual(["#6b7280", "#6b7280", "#3b82f6", "blue"]);
  });

  it("keeps survey titles and choices inside their attributes", () => {
    const root = mount(
      renderQuestionInput(
        {
          _id: "q1",
          config: { allowOther: true, choices: [BREAKOUT] },
          order: 0,
          required: false,
          title: BREAKOUT,
          type: "single_choice",
        },
        undefined,
        { selected: true, text: BREAKOUT }
      )
    );
    expect(injectedHandlers(root)).toEqual([]);
    expect(root.querySelector("[data-select]")?.textContent).toBe(BREAKOUT);
    expect(root.querySelector("input")?.value).toBe(BREAKOUT);
  });
});
