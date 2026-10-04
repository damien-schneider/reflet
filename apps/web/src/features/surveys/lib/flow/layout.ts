import {
  DEFAULT_ENDING,
  endingsOf,
  type FlowQuestion,
  type FlowTarget,
  flowEdges,
  type LogicRule,
  type SurveyEnding,
  sortByOrder,
} from "@reflet/survey-core";

export const START_NODE_ID = "start";

export const endingNodeId = (endingId: string): string => `ending:${endingId}`;

export const FLOW_NODE_WIDTH = 272;
/** Every node renders within this height, so rows never collide. */
export const FLOW_NODE_MAX_HEIGHT = 208;
const COLUMN_GAP = 120;
const ROW_GAP = 56;
export const FLOW_COLUMN_PITCH = FLOW_NODE_WIDTH + COLUMN_GAP;
export const FLOW_ROW_PITCH = FLOW_NODE_MAX_HEIGHT + ROW_GAP;

export type FlowConnection =
  | { id: string; kind: "start"; source: string; target: string }
  | {
      id: string;
      kind: "default";
      source: string;
      target: string;
      /** The question chose this target explicitly with `next`. */
      isExplicit: boolean;
    }
  | {
      id: string;
      kind: "rule";
      rule: LogicRule;
      ruleIndex: number;
      source: string;
      target: string;
    };

export type FlowLayoutNode =
  | { id: string; kind: "start"; x: number; y: number }
  | { id: string; kind: "question"; questionId: string; x: number; y: number }
  | { endingId: string; id: string; kind: "ending"; x: number; y: number };

const nodeIdForTarget = (
  target: FlowTarget,
  orderOf: ReadonlyMap<string, number>,
  fromOrder: number,
  endings: readonly SurveyEnding[]
): string | null => {
  if (target.kind === "ending") {
    const ending =
      endings.find((candidate) => candidate.id === target.endingId) ??
      endings[0];
    return ending ? endingNodeId(ending.id) : null;
  }
  const targetOrder = orderOf.get(target.questionId);
  return targetOrder !== undefined && targetOrder > fromOrder
    ? target.questionId
    : null;
};

/** Every connection the respondent can take, as drawable node-to-node links. Backward jumps are not drawn: the runtime ignores them. */
export const flowConnections = (
  questions: readonly FlowQuestion[],
  storedEndings?: readonly SurveyEnding[]
): FlowConnection[] => {
  const sorted = sortByOrder(questions);
  const endings = endingsOf(storedEndings);
  const orderOf = new Map(
    sorted.map((question) => [question._id, question.order])
  );
  const [first] = sorted;
  const startTarget = first
    ? first._id
    : endingNodeId(endings[0]?.id ?? DEFAULT_ENDING.id);
  const connections: FlowConnection[] = [
    {
      id: `${START_NODE_ID}->${startTarget}`,
      kind: "start",
      source: START_NODE_ID,
      target: startTarget,
    },
  ];
  const ruleIndexBySource = new Map<string, number>();
  for (const edge of flowEdges(sorted, endings)) {
    const fromOrder = orderOf.get(edge.from) ?? 0;
    const target = nodeIdForTarget(edge.target, orderOf, fromOrder, endings);
    if (target === null) {
      continue;
    }
    if (edge.kind === "rule") {
      const ruleIndex = ruleIndexBySource.get(edge.from) ?? 0;
      ruleIndexBySource.set(edge.from, ruleIndex + 1);
      connections.push({
        id: `${edge.from}->rule:${edge.rule.id}`,
        kind: "rule",
        rule: edge.rule,
        ruleIndex,
        source: edge.from,
        target,
      });
      continue;
    }
    const question = sorted.find((candidate) => candidate._id === edge.from);
    connections.push({
      id: `${edge.from}->default`,
      isExplicit: question?.next !== undefined,
      kind: "default",
      source: edge.from,
      target,
    });
  }
  return connections;
};

/** Rules fan out around their question's row: first above, second below, then further out. */
const ruleRowOffset = (ruleIndex: number): number =>
  ruleIndex % 2 === 0 ? -(ruleIndex / 2 + 1) : (ruleIndex + 1) / 2;

const nearestFreeRow = (used: ReadonlySet<number>, preferred: number) => {
  for (let distance = 0; ; distance++) {
    if (!used.has(preferred + distance)) {
      return preferred + distance;
    }
    if (!used.has(preferred - distance)) {
      return preferred - distance;
    }
  }
};

const assignColumns = (
  sorted: readonly FlowQuestion[],
  connections: readonly FlowConnection[]
): Map<string, number> => {
  const columns = new Map<string, number>([[START_NODE_ID, 0]]);
  let previousColumn = 0;
  for (const question of sorted) {
    const incomingColumns = connections
      .filter((connection) => connection.target === question._id)
      .map((connection) => columns.get(connection.source) ?? 0);
    const column =
      incomingColumns.length > 0
        ? Math.max(...incomingColumns) + 1
        : previousColumn + 1;
    columns.set(question._id, column);
    previousColumn = column;
  }
  return columns;
};

/**
 * Places the flow left to right: Start, then questions in columns by their
 * longest path from Start, then every ending in the last column. The default
 * path keeps its row; rule targets fan out above and below.
 */
export const layoutSurveyFlow = (
  questions: readonly FlowQuestion[],
  storedEndings?: readonly SurveyEnding[]
): FlowLayoutNode[] => {
  const sorted = sortByOrder(questions);
  const endings = endingsOf(storedEndings);
  const connections = flowConnections(sorted, endings);
  const columns = assignColumns(sorted, connections);
  const endingColumn = Math.max(0, ...columns.values()) + 1;
  for (const ending of endings) {
    columns.set(endingNodeId(ending.id), endingColumn);
  }

  const rows = new Map<string, number>();
  const usedRowsByColumn = new Map<number, Set<number>>();
  const place = (nodeId: string, preferredRow: number) => {
    if (rows.has(nodeId)) {
      return;
    }
    const column = columns.get(nodeId) ?? 0;
    const used = usedRowsByColumn.get(column) ?? new Set<number>();
    const row = nearestFreeRow(used, preferredRow);
    used.add(row);
    usedRowsByColumn.set(column, used);
    rows.set(nodeId, row);
  };
  const placeTargetsOf = (nodeId: string) => {
    const row = rows.get(nodeId) ?? 0;
    const outgoing = connections.filter(
      (connection) => connection.source === nodeId
    );
    for (const connection of outgoing) {
      if (connection.kind !== "rule") {
        place(connection.target, row);
      }
    }
    for (const connection of outgoing) {
      if (connection.kind === "rule") {
        place(connection.target, row + ruleRowOffset(connection.ruleIndex));
      }
    }
  };

  place(START_NODE_ID, 0);
  placeTargetsOf(START_NODE_ID);
  let previousRow = 0;
  for (const question of sorted) {
    place(question._id, previousRow);
    previousRow = rows.get(question._id) ?? previousRow;
    placeTargetsOf(question._id);
  }
  for (const ending of endings) {
    place(endingNodeId(ending.id), 0);
  }

  const positionOf = (nodeId: string) => ({
    x: (columns.get(nodeId) ?? 0) * FLOW_COLUMN_PITCH,
    y: (rows.get(nodeId) ?? 0) * FLOW_ROW_PITCH,
  });
  return [
    { id: START_NODE_ID, kind: "start", ...positionOf(START_NODE_ID) },
    ...sorted.map(
      (question): FlowLayoutNode => ({
        id: question._id,
        kind: "question",
        questionId: question._id,
        ...positionOf(question._id),
      })
    ),
    ...endings.map(
      (ending): FlowLayoutNode => ({
        endingId: ending.id,
        id: endingNodeId(ending.id),
        kind: "ending",
        ...positionOf(endingNodeId(ending.id)),
      })
    ),
  ];
};
