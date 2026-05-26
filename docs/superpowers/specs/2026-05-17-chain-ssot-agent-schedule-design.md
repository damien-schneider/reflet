# Chain page as single source of truth — agent schedule

## Goal

The autopilot chain page (`/dashboard/[orgSlug]/autopilot/chain`) must reflect the live backend decision logic for every agent. A user looking at the page should know, at a glance: which agents will work, which are blocked, why, and what they will do next — without having to read activity-log entries.

This is both a **refactor for SSOT** and a **UI surfacing** task.

## Problems addressed

1. **Drift between backend and UI.** The heartbeat decides which agents wake, dispatches chain producers, and logs results. The UI shows DAG status and recent activity, but never shows the per-agent decision logic the heartbeat just executed.
2. **Artificial blockers.** The current heartbeat caps agents per cycle, deprioritizes "no output last run", enforces 5-minute and 30-minute cooldowns, and gates the entire chain on open-task count. These create the misleading state where the autopilot looks broken ("skipped [cto (no output last run), growth (disabled), pm (no work)]") while no work is actually happening and no debugging signal is visible.
3. **Misleading node badges.** `codebase_understanding` shows "Available" badge whenever there is no document, even when its real precondition (`repoAnalysisReady`) is unmet — the CTO producer refuses to run and the user sees no explanation.
4. **Duplicated config.** `heartbeat_conditions.ts` redefines `NODE_OWNERS` which already exists in `chain.ts` as `CHAIN_NODE_OWNERS`. Producer-candidate logic in `heartbeat.ts` redefines the DAG transitions.

## Design rules

- **Only legitimate blockers may stop an agent.** Acceptable: `user_approval`, `credits_or_usage`, `dag_dep_missing`, `precondition_unmet`, `agent_disabled`, `in_flight`, `circuit_breaker`. Everything else is an artificial cap and must be removed.
- **No loops, but anti-loop must be state-driven, not time-driven.** Skip a wake only when the state of the system has not advanced since the last attempt for that target. Don't use wall-clock cooldowns.
- **Heartbeat is a dumb clock.** Every tick: compute schedule, dispatch all ready agents in parallel, exit. No per-cycle budget. No log unless work was dispatched.
- **One module owns agent decisions.** `agent_schedule.ts` is the single source of truth. Heartbeat and UI both consume it; neither re-implements it.

## Architecture

### Backend module: `packages/backend/convex/autopilot/agent_schedule.ts`

Pure-ish function:

```ts
type AgentKind = "cto" | "pm" | "growth" | "sales" | "ceo" | "support" | "validator";

type AgentBlocker =
  | { kind: "agent_disabled" }
  | { kind: "billing_or_usage"; detail: string }
  | { kind: "circuit_breaker"; detail: string }
  | { kind: "chain_dep_missing"; nodes: ChainNodeKind[] }
  | { kind: "precondition_unmet"; node: ChainNodeKind; reason: string }
  | { kind: "awaiting_user_review"; count: number }
  | { kind: "no_work" };

type AgentNextAction =
  | { kind: "chain_producer"; node: ChainNodeKind }
  | { kind: "task_dispatch"; taskId: Id<"autopilotWorkItems">; title: string }
  | { kind: "validation_pass"; count: number }
  | { kind: "support_triage"; count: number }
  | { kind: "ceo_coordination"; reason: "errors" | "stuck_reviews" }
  | { kind: "growth_content"; reason: "shipped_features" };

interface AgentScheduleEntry {
  agent: AgentKind;
  state: "ready" | "blocked" | "disabled";
  nextAction: AgentNextAction | null;
  blockers: AgentBlocker[];
}

export const computeAgentSchedule = async (
  ctx,
  orgId
): Promise<AgentScheduleEntry[]>
```

The function consumes:
- `computeChainState` (from `chain.ts`)
- `checkGuards` (from `guards.ts`) — derives billing/credit/circuit blockers
- enabled-agents set
- chain producer candidates (cto/pm/growth: which node would the producer try next?)
- pending validation count, support count, error count, shipped-without-content count

Output is exactly what the heartbeat will dispatch on the next tick AND what the UI must show.

### Heartbeat: stripped

`heartbeat.ts` becomes:

```ts
runHeartbeat: for each org with autopilot configured:
  schedule = computeAgentSchedule(ctx, orgId)
  for entry of schedule where state === "ready":
    dispatch(entry.nextAction)
  for pending task with assigned agent (and agent ready):
    dispatch task (existing dispatchPendingTasks loop, but only respecting enabled + circuit breaker — no MAX_DISPATCH_PER_TICK cap)
```

Removed:
- `MAX_AGENTS_PER_CYCLE = 3`
- `AGENT_WAKE_COOLDOWN_MS = 5min`
- `NO_OUTPUT_RETRY_COOLDOWN_MS = 30min` + `didAgentProduceOutput`
- `isAgentRecentlyWoken` time-based check
- `wakeThresholdOpenTasks` chain gating
- `pipelineFull` PM skip
- `MAX_DISPATCH_PER_TICK = 2` task dispatch cap
- The `"Heartbeat: woke [...], skipped [...]"` log entry (silent clock)

Kept:
- `checkGuards` (billing, daily cost cap, daily task limit, rate limit, circuit breaker) — these are credits/usage/anti-loop
- Idempotency: in-flight detection per `(agent, target)` — derived from a fresh activity-log lookback for the *same target identifier*, not a blanket cooldown
- Per-org guard

### Node preconditions: generic

`chain.ts` gains:

```ts
type NodePreconditionResult = { met: true } | { met: false; reason: string };
type NodePrecondition = (ctx, orgId) => Promise<NodePreconditionResult>;

const NODE_PRECONDITIONS: Partial<Record<ChainNodeKind, NodePrecondition>> = {
  codebase_understanding: async (ctx, orgId) => {
    const ready = await fetchRepoAnalysisReady(ctx, orgId);
    return ready ? { met: true } : { met: false, reason: "Waiting for repo analysis" };
  },
};

export const checkNodePrecondition = async (ctx, orgId, kind): Promise<NodePreconditionResult>
```

`getChainOverview` returns an additional `preconditionUnmet?: { reason: string }` per node. The card uses this to switch the badge from "Available" to "Locked" with the reason as the blocker hint.

`agent_schedule.computeAgentSchedule` consumes the same preconditions when deciding what a producer can actually run.

### Public query: `getAgentSchedule`

`packages/backend/convex/autopilot/queries/agent_schedule.ts`:

```ts
export const getAgentSchedule = query({
  args: { organizationId: v.id("organizations") },
  returns: v.array(agentScheduleEntryValidator),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);
    return await computeAgentSchedule(ctx, args.organizationId);
  },
});
```

### UI

**New component:** `apps/web/src/features/autopilot/components/agent-schedule-panel.tsx`

Renders one row per agent (CTO, PM, Growth, Sales, Support, Validator, CEO) with:
- Owner icon + name
- State pill: Ready (green) / Working (animated) / Blocked (red/amber) / Disabled (gray)
- Next action (eg "Producing personas", "Validating 3 docs", "—")
- Blocker chip(s) if blocked

Placed above the DAG on the chain page. Uses `getAgentSchedule` query + `getActiveChainWork` to mark "Working" state.

**Updated component:** `chain-tech-tree-card.tsx` consumes `preconditionUnmet` to compute badge (`Locked` instead of `Available`) and shows the precondition reason in `CardBlockersHint`.

**Updated component:** `chain/page.tsx` mounts `<AgentSchedulePanel/>` above `<ChainTechTree/>`.

## Files

**New**
- `packages/backend/convex/autopilot/agent_schedule.ts`
- `packages/backend/convex/autopilot/queries/agent_schedule.ts`
- `packages/backend/convex/autopilot/__tests__/agent_schedule.test.ts`
- `apps/web/src/features/autopilot/components/agent-schedule-panel.tsx`
- `apps/web/src/features/autopilot/components/__tests__/agent-schedule-panel.test.tsx`

**Modified**
- `packages/backend/convex/autopilot/chain.ts` — add `NODE_PRECONDITIONS`, `checkNodePrecondition`
- `packages/backend/convex/autopilot/queries/chain.ts` — return `preconditionUnmet` in `getChainOverview`
- `packages/backend/convex/autopilot/heartbeat.ts` — strip caps/cooldowns, consume `computeAgentSchedule`
- `packages/backend/convex/autopilot/heartbeat_conditions.ts` — remove duplicate `NODE_OWNERS`, move `shouldWake*` to `agent_schedule.ts`, keep data collectors
- `apps/web/src/features/autopilot/components/chain-tech-tree-card.tsx` — respect precondition for badge + blocker hint
- `apps/web/app/(app)/dashboard/[orgSlug]/autopilot/chain/page.tsx` — render schedule panel

## Tests

- `agent_schedule.test.ts`: each agent across each blocker kind; ensures heartbeat consumes the same shape.
- `agent-schedule-panel.test.tsx`: renders all blocker shapes; smoke-tests states.

## Out of scope

- Refactoring the dispatch agent boundary (CTO/PM/Growth/Sales agent code).
- Streaming live "agent is thinking" indicators beyond what `getActiveChainWork` already exposes.
- Reworking the activity log filter UI.
