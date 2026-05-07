/**
 * Routine evaluation — check & dispatch recurring scheduled tasks.
 *
 * Called by the heartbeat cron to evaluate which routines are due for execution,
 * then creates tasks from their templates.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";

interface RoutineTemplate {
  description?: string;
  priority?: "critical" | "high" | "medium" | "low";
  title?: string;
}

/**
 * Simple cron-like matcher for "minute hour dayOfMonth month dayOfWeek".
 *
 * Supports: numbers, `*`, step syntax (`* /N`), ranges (`N-M`), lists (`N,M`).
 * Does NOT support complex expressions like `L` or `W`.
 */
function matchesCronField(field: string, value: number): boolean {
  if (field === "*") {
    return true;
  }

  for (const part of field.split(",")) {
    if (part.includes("/")) {
      const [range, stepStr] = part.split("/");
      const step = Number.parseInt(stepStr ?? "1", 10);
      if (range === "*" && value % step === 0) {
        return true;
      }
    } else if (part.includes("-")) {
      const [startStr, endStr] = part.split("-");
      const start = Number.parseInt(startStr ?? "0", 10);
      const end = Number.parseInt(endStr ?? "0", 10);
      if (value >= start && value <= end) {
        return true;
      }
    } else if (Number.parseInt(part, 10) === value) {
      return true;
    }
  }

  return false;
}

const CRON_SPLIT_RE = /\s+/;
const MIN_ROUTINE_INTERVAL_MS = 50 * 60 * 1000;

function cronMatchesNow(cronExpression: string, date: Date): boolean {
  const parts = cronExpression.trim().split(CRON_SPLIT_RE);
  if (parts.length !== 5) {
    return false;
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  if (!(minute && hour && dayOfMonth && month && dayOfWeek)) {
    return false;
  }

  return (
    matchesCronField(minute, date.getUTCMinutes()) &&
    matchesCronField(hour, date.getUTCHours()) &&
    matchesCronField(dayOfMonth, date.getUTCDate()) &&
    matchesCronField(month, date.getUTCMonth() + 1) &&
    matchesCronField(dayOfWeek, date.getUTCDay())
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringField(
  record: Record<string, unknown>,
  field: string
): string | undefined {
  const value = record[field];
  return typeof value === "string" ? value : undefined;
}

function getPriority(value: string | undefined): RoutineTemplate["priority"] {
  if (
    value === "critical" ||
    value === "high" ||
    value === "medium" ||
    value === "low"
  ) {
    return value;
  }
  return undefined;
}

function parseRoutineTemplate(template: string): RoutineTemplate | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(template);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) {
    return null;
  }

  return {
    description: getStringField(parsed, "description"),
    priority: getPriority(getStringField(parsed, "priority")),
    title: getStringField(parsed, "title"),
  };
}

function isRoutineAgentEnabled(
  agent: string,
  config: {
    ctoEnabled?: boolean;
    devEnabled?: boolean;
    growthEnabled?: boolean;
    pmEnabled?: boolean;
    salesEnabled?: boolean;
    supportEnabled?: boolean;
  }
): boolean {
  if (agent === "pm") {
    return config.pmEnabled !== false;
  }
  if (agent === "cto") {
    return config.ctoEnabled !== false;
  }
  if (agent === "dev") {
    return config.devEnabled !== false;
  }
  if (agent === "growth") {
    return config.growthEnabled !== false;
  }
  if (agent === "support") {
    return config.supportEnabled !== false;
  }
  if (agent === "sales") {
    return config.salesEnabled !== false;
  }
  return true;
}

function isAutopilotConfigRunnable(
  config: {
    autonomyMode?: "full_auto" | "stopped" | "supervised";
    enabled: boolean;
  } | null
): boolean {
  return Boolean(
    config?.enabled && (config.autonomyMode ?? "supervised") !== "stopped"
  );
}

function canRunRoutine({
  config,
  currentDate,
  now,
  routine,
}: {
  config: Parameters<typeof isRoutineAgentEnabled>[1] & {
    autonomyMode?: "full_auto" | "stopped" | "supervised";
    enabled: boolean;
  };
  currentDate: Date;
  now: number;
  routine: {
    agent: string;
    cronExpression: string;
    enabled: boolean;
    lastRunAt?: number;
  };
}): boolean {
  if (!(routine.enabled && isAutopilotConfigRunnable(config))) {
    return false;
  }
  if (!isRoutineAgentEnabled(routine.agent, config)) {
    return false;
  }
  if (routine.lastRunAt && now - routine.lastRunAt < MIN_ROUTINE_INTERVAL_MS) {
    return false;
  }
  return cronMatchesNow(routine.cronExpression, currentDate);
}

/**
 * Evaluate all routines for all orgs. Called in the heartbeat.
 *
 * For each enabled routine whose cron matches the current time,
 * create a task from the template.
 */
export const evaluateRoutines = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();
    const currentDate = new Date(now);
    let dispatched = 0;

    const routines = await ctx.db.query("autopilotRoutines").collect();

    for (const routine of routines) {
      const config = await ctx.db
        .query("autopilotConfig")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", routine.organizationId)
        )
        .unique();
      if (!(config && canRunRoutine({ config, currentDate, now, routine }))) {
        continue;
      }

      const template = parseRoutineTemplate(routine.taskTemplate);
      if (!template) {
        continue;
      }

      const taskId = await ctx.runMutation(
        internal.autopilot.task_mutations.createTask,
        {
          organizationId: routine.organizationId,
          title: template.title ?? routine.title,
          description: template.description ?? routine.description ?? "",
          priority: template.priority ?? "medium",
          assignedAgent: routine.agent,
          createdBy: "routine",
        }
      );

      if (!taskId) {
        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
          organizationId: routine.organizationId,
          agent: "system",
          level: "info",
          message: `Routine "${routine.title}" skipped — task caps are full`,
          action: "routine.skipped",
        });
        continue;
      }

      await ctx.db.patch(routine._id, {
        lastRunAt: now,
        updatedAt: now,
      });

      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: routine.organizationId,
        taskId,
        agent: "system",
        level: "action",
        message: `Routine "${routine.title}" triggered — task created`,
        action: "routine.triggered",
      });

      dispatched++;
    }

    return dispatched;
  },
});
