import {
  type BoardChange,
  type BoardContribution,
  type BoardHandoff,
  type BoardIntention,
  type BoardRequest,
  type BoardSession,
  type BoardState,
  continuedIntentionView,
  contributionView,
  findSession,
  proposalView,
  screenshotContext,
} from "./session-views";

export const PROPOSAL_NEED = "Show that the plan was saved";
export const PROPOSAL_CALLOUT = "No sign the plan saved";
export const PRECISION = "Does the saved plan survive a reload?";
export const SOLUTION = "Show a toast after saving";

export function addIntention(state: BoardState, session: BoardSession) {
  state.intentions.push({
    callout: PROPOSAL_CALLOUT,
    calloutEvidenceId:
      session.evidence
        .filter(({ status }) => status === "available")
        .map(({ id }) => String(id))
        .at(-1) ?? null,
    decision: "pending",
    id: `proposal-${state.intentions.length + 1}`,
    lastHandoff: null,
    need: PROPOSAL_NEED,
    observed: "The author saved a plan and could not tell whether it worked.",
    response: null,
    revision: 1,
    segmentIds: session.segments.map((segment) => String(segment.id)),
    sessionId: session.id,
    setAside: ["A history of plans"],
    unknowns: [],
  });
}

function proposedChanges(): BoardChange[] {
  return [
    {
      decision: "pending",
      evidenceIds: [],
      field: "unknowns",
      hypothesis: false,
      id: "change-precision",
      kind: "precision",
      operation: "add",
      reason: "The author reloaded the page to check whether the plan stayed.",
      segmentIds: [],
      value: PRECISION,
    },
    {
      decision: "pending",
      evidenceIds: [],
      field: "response",
      hypothesis: true,
      id: "change-solution",
      kind: "solution",
      operation: "replace",
      reason: "The author suggested a toast while talking.",
      segmentIds: [],
      value: SOLUTION,
    },
  ];
}

export function addContribution(state: BoardState, session: BoardSession) {
  if (!session.continues) {
    return;
  }
  state.contributions.push({
    applied: [],
    baseRevision: session.continues.revision,
    changes: proposedChanges(),
    id: `contribution-${state.contributions.length + 1}`,
    intentionId: session.continues.intentionId,
    sessionId: session.id,
  });
}

export function citeSessionSources(state: BoardState) {
  for (const contribution of state.contributions) {
    const session = findSession(state, contribution.sessionId);
    const segmentIds = session.segments.slice(0, 1).map(({ id }) => String(id));
    const evidenceIds = session.evidence
      .slice(0, 1)
      .map(({ id }) => String(id));
    for (const change of contribution.changes) {
      change.segmentIds = segmentIds;
      change.evidenceIds = change.kind === "precision" ? evidenceIds : [];
    }
  }
}

function findIntention(state: BoardState, intentionId: unknown) {
  const intention = state.intentions.find(({ id }) => id === intentionId);
  if (!intention) {
    throw new Error(`No intention ${String(intentionId)}`);
  }
  return intention;
}

function findContribution(state: BoardState, contributionId: unknown) {
  const contribution = state.contributions.find(
    ({ id }) => id === contributionId
  );
  if (!contribution) {
    throw new Error(`No contribution ${String(contributionId)}`);
  }
  return contribution;
}

function intentionUpdate(state: BoardState, contribution: BoardContribution) {
  const intention = findIntention(state, contribution.intentionId);
  const home = findSession(state, intention.sessionId);
  return {
    contribution: contributionView(contribution),
    intention: continuedIntentionView(intention, home.title),
  };
}

function applyChange(intention: BoardIntention, change: BoardChange) {
  const before =
    change.field === "unknowns"
      ? intention.unknowns
      : (intention.response ?? "");
  if (change.field === "unknowns") {
    intention.unknowns = [...intention.unknowns, change.value];
  } else {
    intention.response = change.value;
  }
  const after = change.field === "unknowns" ? intention.unknowns : change.value;
  change.decision = "accepted";
  return { after, before, field: change.field };
}

function requestedChangeIds(body: Record<string, unknown>): string[] {
  const changes = Array.isArray(body.changes) ? body.changes : [];
  return changes.flatMap((change: unknown) =>
    typeof change === "object" && change !== null && "changeId" in change
      ? [String(change.changeId)]
      : []
  );
}

function acceptChanges(state: BoardState, body: Record<string, unknown>) {
  const contribution = findContribution(state, body.contributionId);
  const intention = findIntention(state, contribution.intentionId);
  const ids = new Set(requestedChangeIds(body));
  const fields = contribution.changes
    .filter(({ id }) => ids.has(id))
    .map((change) => applyChange(intention, change));
  intention.revision += 1;
  contribution.applied.push({
    at: Date.now(),
    byName: "Ada",
    fields,
    revision: intention.revision,
  });
  return intentionUpdate(state, contribution);
}

function decideChange(state: BoardState, body: Record<string, unknown>) {
  const contribution = findContribution(state, body.contributionId);
  const change = contribution.changes.find(({ id }) => id === body.changeId);
  if (change) {
    change.decision = body.decision === "rejected" ? "rejected" : "pending";
  }
  return intentionUpdate(state, contribution);
}

function briefOutcome(intention: BoardIntention, index: number): string {
  const unknowns = intention.unknowns.map((unknown) => `- ${unknown}`);
  return [
    `${index + 1}. ${intention.need} (revision ${intention.revision})`,
    ...(unknowns.length > 0 ? ["Still unknown:", ...unknowns] : []),
    "Set aside — do not build:",
    ...intention.setAside.map((item) => `- ${item}`),
  ].join("\n");
}

function createHandoff(state: BoardState, body: Record<string, unknown>) {
  const ids = Array.isArray(body.proposalIds) ? body.proposalIds : [];
  const intentions = state.intentions.filter(({ id }) => ids.includes(id));
  const handoff: BoardHandoff = {
    brief: `# Session brief: Plans & billing\n\n## Outcome wanted\n\n${intentions.map(briefOutcome).join("\n\n")}\n`,
    createdAt: Date.now(),
    deliveries: [],
    evidenceIds: [],
    id: `handoff-${state.handoffs.length + 1}`,
    proposals: intentions.map(({ id, need, revision }) => ({
      id,
      need,
      revision,
    })),
    sessionId: String(body.sessionId),
  };
  for (const intention of intentions) {
    intention.lastHandoff = {
      at: handoff.createdAt,
      response: intention.response,
      revision: intention.revision,
    };
  }
  state.handoffs.unshift(handoff);
  return { files: [], handoff };
}

function markDelivered(state: BoardState, body: Record<string, unknown>) {
  const handoff = state.handoffs.find(({ id }) => id === body.handoffId);
  if (!handoff) {
    throw new Error(`No handoff ${String(body.handoffId)}`);
  }
  handoff.deliveries.push({
    at: Date.now(),
    kind: body.kind === "exported" ? "exported" : "copied",
  });
  return { handoff };
}

function contextChoices(state: BoardState, segmentId: string | null) {
  const session = state.sessions.find(({ segments }) =>
    segments.some(({ id }) => id === segmentId)
  );
  return {
    options: (session?.evidence ?? []).map((evidence) => ({
      choice: { evidenceId: String(evidence.id), kind: "evidence" },
      item: screenshotContext(evidence),
      selected: false,
    })),
  };
}

export function intentionResponders(
  state: BoardState
): Record<string, (request: BoardRequest) => unknown> {
  return {
    handoffs: ({ body }) => createHandoff(state, body),
    "handoffs/delivered": ({ body }) => markDelivered(state, body),
    "intentions/accept": ({ body }) => acceptChanges(state, body),
    "intentions/change": ({ body }) => decideChange(state, body),
    "proposals/decide": ({ body }) => {
      const intention = findIntention(state, body.proposalId);
      intention.decision = body.decision === "kept" ? "kept" : "pending";
      return { proposal: proposalView(intention) };
    },
    "segments/context-choices": ({ query }) =>
      contextChoices(state, query.get("segmentId")),
  };
}
