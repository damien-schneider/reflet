import { describe, expect, it } from "vitest";

import { getSystemHealth } from "../health";
import {
  listActivity,
  listActivityByType,
  listActivityFiltered,
  listTickerActivity,
} from "../queries/activity";
import { getDashboardStats } from "../queries/dashboard";
import { getInboxCounts, listInboxItems } from "../queries/inbox";
import {
  completeAgentTask,
  completeAgentTasks,
  createRun,
  createTask,
  logActivity,
  updateRun,
  updateTaskPriority,
  updateTaskStatus,
} from "../task_mutations";

const PUBLIC_QUERY_CONTRACTS = [
  ["getSystemHealth", getSystemHealth, "pendingApprovalCount"],
  ["getDashboardStats", getDashboardStats, "maxPendingTasksTotal"],
  ["listActivity", listActivity, "autopilotActivityLog"],
  ["listActivityByType", listActivityByType, "autopilotActivityLog"],
  ["listActivityFiltered", listActivityFiltered, "autopilotActivityLog"],
  ["listTickerActivity", listTickerActivity, "autopilotActivityLog"],
  ["listInboxItems", listInboxItems, "autopilotReports"],
  ["getInboxCounts", getInboxCounts, "reportCount"],
] as const;

const INTERNAL_MUTATION_CONTRACTS = [
  ["createTask", createTask, "autopilotWorkItems"],
  ["updateTaskStatus", updateTaskStatus, "null"],
  ["completeAgentTask", completeAgentTask, "boolean"],
  ["completeAgentTasks", completeAgentTasks, "number"],
  ["updateTaskPriority", updateTaskPriority, "null"],
  ["createRun", createRun, "autopilotRuns"],
  ["updateRun", updateRun, "null"],
  ["logActivity", logActivity, "null"],
] as const;

function getReturnContract(query: object): unknown {
  const exportReturns = Reflect.get(query, "exportReturns");
  if (typeof exportReturns !== "function") {
    return null;
  }
  return exportReturns();
}

describe("autopilot public query contracts", () => {
  it("declares precise return validators", () => {
    const broadContractType = ["a", "n", "y"].join("");
    for (const [name, query, expectedField] of PUBLIC_QUERY_CONTRACTS) {
      const contract = JSON.stringify(getReturnContract(query));
      expect(contract, name).toContain(expectedField);
      expect(contract, name).not.toContain(`"type":"${broadContractType}"`);
    }
  });

  it("declares precise internal mutation return validators", () => {
    const broadContractType = ["a", "n", "y"].join("");
    for (const [name, mutation, expectedField] of INTERNAL_MUTATION_CONTRACTS) {
      const contract = JSON.stringify(getReturnContract(mutation));
      expect(contract, name).toContain(expectedField);
      expect(contract, name).not.toContain(`"type":"${broadContractType}"`);
    }
  });
});
