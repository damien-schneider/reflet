import type { FlowQuestion, SurveyEnding } from "@reflet/survey-core";
import { describe, expect, it } from "vitest";
import {
  FLOW_NODE_MAX_HEIGHT,
  FLOW_NODE_WIDTH,
  type FlowLayoutNode,
  flowConnections,
  layoutSurveyFlow,
} from "./layout";

const endings: SurveyEnding[] = [
  { id: "thanks", title: "Thanks" },
  { id: "promoters", title: "Thank you!" },
];

const question = (
  id: string,
  order: number,
  extra: Partial<FlowQuestion> = {}
): FlowQuestion => ({ _id: id, order, required: true, type: "text", ...extra });

const npsFlow: FlowQuestion[] = [
  question("score", 0, {
    logic: [
      {
        id: "low",
        operator: "less_than",
        target: { kind: "question", questionId: "why-low" },
        value: 7,
      },
      {
        id: "high",
        operator: "greater_than",
        target: { kind: "question", questionId: "love" },
        value: 8,
      },
    ],
    next: { kind: "question", questionId: "improve" },
    type: "nps",
  }),
  question("why-low", 1, { next: { endingId: "thanks", kind: "ending" } }),
  question("improve", 2, { next: { endingId: "thanks", kind: "ending" } }),
  question("love", 3, { next: { endingId: "promoters", kind: "ending" } }),
];

const overlaps = (a: FlowLayoutNode, b: FlowLayoutNode) =>
  Math.abs(a.x - b.x) < FLOW_NODE_WIDTH &&
  Math.abs(a.y - b.y) < FLOW_NODE_MAX_HEIGHT;

describe("layoutSurveyFlow", () => {
  it("never places two nodes on top of each other", () => {
    const layout = layoutSurveyFlow(npsFlow, endings);
    for (const [index, node] of layout.entries()) {
      for (const other of layout.slice(index + 1)) {
        expect(overlaps(node, other), `${node.id} overlaps ${other.id}`).toBe(
          false
        );
      }
    }
  });

  it("fans the branches of one question out on separate rows", () => {
    const layout = layoutSurveyFlow(npsFlow, endings);
    const rowOf = (id: string) => layout.find((node) => node.id === id)?.y;
    const branchRows = ["why-low", "improve", "love"].map(rowOf);
    expect(new Set(branchRows).size).toBe(branchRows.length);
    expect(rowOf("improve")).toBe(rowOf("score"));
  });

  it("is deterministic and ignores the order questions arrive in", () => {
    const first = layoutSurveyFlow(npsFlow, endings);
    expect(layoutSurveyFlow(npsFlow, endings)).toEqual(first);
    expect(layoutSurveyFlow([...npsFlow].reverse(), endings)).toEqual(first);
  });

  it("puts every ending to the right of every question, and every link points right", () => {
    const layout = layoutSurveyFlow(npsFlow, endings);
    const xOf = new Map(layout.map((node) => [node.id, node.x]));
    const questionXs = layout
      .filter((node) => node.kind !== "ending")
      .map((node) => node.x);
    const endingXs = layout
      .filter((node) => node.kind === "ending")
      .map((node) => node.x);
    expect(Math.min(...endingXs)).toBeGreaterThan(Math.max(...questionXs));
    for (const connection of flowConnections(npsFlow, endings)) {
      expect(xOf.get(connection.target)).toBeGreaterThan(
        xOf.get(connection.source) ?? 0
      );
    }
  });

  it("lays out an empty survey as Start leading to the default ending", () => {
    const layout = layoutSurveyFlow([], undefined);
    expect(layout.map((node) => node.kind)).toEqual(["start", "ending"]);
    expect(flowConnections([], undefined)).toEqual([
      expect.objectContaining({ source: "start", target: "ending:default" }),
    ]);
  });

  it("does not draw jumps that point backward, as the runtime ignores them", () => {
    const backward = [
      question("a", 0),
      question("b", 1, { next: { kind: "question", questionId: "a" } }),
    ];
    const targetsOfB = flowConnections(backward, undefined)
      .filter((connection) => connection.source === "b")
      .map((connection) => connection.target);
    expect(targetsOfB).toEqual(["ending:default"]);
  });
});
