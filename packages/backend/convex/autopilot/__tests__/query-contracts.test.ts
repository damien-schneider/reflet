/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";

import { createDevSubtask } from "../agents/cto";
import { canDispatchTask, getAdapterCredentials } from "../config";
import {
  markCredentialsValid,
  reserveTaskExecution,
  upsertAdapterCredentials,
  validateAdapterCredentials,
} from "../config_mutations";
import { executeTask, retryTask } from "../execution";
import { cancelTask, pollTaskStatus } from "../execution_lifecycle";
import { getSystemHealth } from "../health";
import {
  listActivity,
  listActivityByType,
  listActivityFiltered,
  listTickerActivity,
} from "../queries/activity";
import {
  getAgentPerformance,
  getAgentReadiness,
  getChartData,
  getContentQualityOverview,
  getDashboardStats,
} from "../queries/dashboard";
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
import {
  getDispatchableTasks,
  getOrganization,
  getPendingTasks,
  getRecentActivity,
  getRun,
  getRunsForTask,
  getSubtasks,
  getTask,
  getTasksByOrg,
} from "../task_queries";

const PUBLIC_QUERY_CONTRACTS = [
  ["getSystemHealth", getSystemHealth, "pendingApprovalCount"],
  ["getDashboardStats", getDashboardStats, "maxPendingTasksTotal"],
  ["getChartData", getChartData, "activityTimeline"],
  ["getAgentReadiness", getAgentReadiness, "ready"],
  ["getAgentPerformance", getAgentPerformance, "successRate"],
  ["getContentQualityOverview", getContentQualityOverview, "totalPending"],
  ["listActivity", listActivity, "autopilotActivityLog"],
  ["listActivityByType", listActivityByType, "autopilotActivityLog"],
  ["listActivityFiltered", listActivityFiltered, "autopilotActivityLog"],
  ["listTickerActivity", listTickerActivity, "autopilotActivityLog"],
  ["listInboxItems", listInboxItems, "autopilotReports"],
  ["getInboxCounts", getInboxCounts, "reportCount"],
] as const;

const INTERNAL_MUTATION_CONTRACTS = [
  ["createTask", createTask, "autopilotWorkItems"],
  ["updateTaskStatus", updateTaskStatus, '"type":"null"'],
  ["completeAgentTask", completeAgentTask, "boolean"],
  ["completeAgentTasks", completeAgentTasks, "number"],
  ["updateTaskPriority", updateTaskPriority, '"type":"null"'],
  ["createRun", createRun, "autopilotRuns"],
  ["updateRun", updateRun, '"type":"null"'],
  ["logActivity", logActivity, '"type":"null"'],
  ["reserveTaskExecution", reserveTaskExecution, "allowed"],
  [
    "upsertAdapterCredentials",
    upsertAdapterCredentials,
    "autopilotAdapterCredentials",
  ],
  ["markCredentialsValid", markCredentialsValid, '"type":"null"'],
] as const;

const INTERNAL_ACTION_CONTRACTS = [
  ["createDevSubtask", createDevSubtask, "autopilotWorkItems"],
  ["validateAdapterCredentials", validateAdapterCredentials, "boolean"],
  ["executeTask", executeTask, '"type":"null"'],
  ["retryTask", retryTask, '"type":"null"'],
  ["pollTaskStatus", pollTaskStatus, '"type":"null"'],
  ["cancelTask", cancelTask, '"type":"null"'],
] as const;

const INTERNAL_QUERY_CONTRACTS = [
  ["getAdapterCredentials", getAdapterCredentials, "credentials"],
  ["canDispatchTask", canDispatchTask, "boolean"],
  ["getDispatchableTasks", getDispatchableTasks, "autopilotWorkItems"],
  ["getOrganization", getOrganization, "organizations"],
  ["getPendingTasks", getPendingTasks, "autopilotWorkItems"],
  ["getTask", getTask, "autopilotWorkItems"],
  ["getSubtasks", getSubtasks, "autopilotWorkItems"],
  ["getTasksByOrg", getTasksByOrg, "autopilotWorkItems"],
  ["getRunsForTask", getRunsForTask, "autopilotRuns"],
  ["getRun", getRun, "autopilotRuns"],
  ["getRecentActivity", getRecentActivity, "autopilotActivityLog"],
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
      const contract = String(getReturnContract(mutation));
      expect(contract, name).toContain(expectedField);
      expect(contract, name).not.toContain(`"type":"${broadContractType}"`);
    }
  });

  it("declares precise internal action return validators", () => {
    const broadContractType = ["a", "n", "y"].join("");
    for (const [name, action, expectedField] of INTERNAL_ACTION_CONTRACTS) {
      const contract = String(getReturnContract(action));
      expect(contract, name).toContain(expectedField);
      expect(contract, name).not.toContain(`"type":"${broadContractType}"`);
    }
  });

  it("declares precise internal query return validators", () => {
    const broadContractType = ["a", "n", "y"].join("");
    for (const [name, query, expectedField] of INTERNAL_QUERY_CONTRACTS) {
      const contract = String(getReturnContract(query));
      expect(contract, name).toContain(expectedField);
      expect(contract, name).not.toContain(`"type":"${broadContractType}"`);
    }
  });
});
