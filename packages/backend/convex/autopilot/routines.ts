/**
 * Routine evaluation — check & dispatch recurring scheduled tasks.
 *
 * Called by the heartbeat cron to evaluate which routines are due for execution,
 * then creates tasks from their templates.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";

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
      if (!routine.enabled) {
        continue;
      }

      // Skip if already run within the last 50 minutes (avoid double-fire from 3-min cron)
      const minInterval = 50 * 60 * 1000;
      if (routine.lastRunAt && now - routine.lastRunAt < minInterval) {
        continue;
      }

      if (!cronMatchesNow(routine.cronExpression, currentDate)) {
        continue;
      }

      // Parse task template and create a task
      let template: { title?: string; description?: string; priority?: string };
      try {
        template = JSON.parse(routine.taskTemplate) as typeof template;
      } catch {
        continue;
      }

      await ctx.runMutation(internal.autopilot.tasks.createTask, {
        organizationId: routine.organizationId,
        title: template.title ?? routine.title,
        description: template.description ?? routine.description ?? "",
        priority:
          (template.priority as "critical" | "high" | "medium" | "low") ??
          "medium",
        assignedAgent: routine.agent,
        createdBy: "routine",
      });

      await ctx.db.patch(routine._id, {
        lastRunAt: now,
        updatedAt: now,
      });

      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: routine.organizationId,
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
