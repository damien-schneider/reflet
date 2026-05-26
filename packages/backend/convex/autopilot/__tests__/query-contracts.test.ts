/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { canDispatchTask } from "../config";
import { reserveTaskExecution } from "../config_mutations";
import { cancelTask } from "../execution_lifecycle";
import { getSystemHealth } from "../health";
import {
  listActivity,
  listActivityByType,
  listActivityFiltered,
  listActivityPaginated,
  listTickerActivity,
  listWorkItemActivity,
} from "../queries/activity";
import {
  getChartData,
  getContentQualityOverview,
  getDashboardStats,
  getRolePerformance,
  getRoleReadiness,
} from "../queries/dashboard";
import { getInboxCounts, listInboxItems } from "../queries/inbox";
import { runCTOSpecGeneration } from "../role_skills/cto";
import { runExecutionFromRecord } from "../runtime/lifecycle";
import {
  completeRoleTask,
  completeRoleTasks,
  createTask,
  logActivity,
  updateTaskPriority,
  updateTaskStatus,
} from "../task_mutations";
import {
  getDispatchableTasks,
  getOrganization,
  getPendingTasks,
  getRecentActivity,
  getSubtasks,
  getTask,
  getTasksByOrg,
} from "../task_queries";

const PUBLIC_QUERY_CONTRACTS = [
  ["getSystemHealth", getSystemHealth, "pendingApprovalCount"],
  ["getDashboardStats", getDashboardStats, "maxPendingTasksTotal"],
  ["getChartData", getChartData, "activityTimeline"],
  ["getRoleReadiness", getRoleReadiness, "ready"],
  ["getRolePerformance", getRolePerformance, "successRate"],
  ["getContentQualityOverview", getContentQualityOverview, "totalPending"],
  ["listActivity", listActivity, "autopilotActivityLog"],
  ["listActivityByType", listActivityByType, "autopilotActivityLog"],
  ["listActivityFiltered", listActivityFiltered, "autopilotActivityLog"],
  ["listActivityPaginated", listActivityPaginated, "autopilotActivityLog"],
  ["listTickerActivity", listTickerActivity, "autopilotActivityLog"],
  ["listWorkItemActivity", listWorkItemActivity, "autopilotActivityLog"],
  ["listInboxItems", listInboxItems, "autopilotReports"],
  ["getInboxCounts", getInboxCounts, "reportCount"],
] as const;

const INTERNAL_MUTATION_CONTRACTS = [
  ["createTask", createTask, "autopilotWorkItems"],
  ["updateTaskStatus", updateTaskStatus, '"type":"null"'],
  ["completeRoleTask", completeRoleTask, "boolean"],
  ["completeRoleTasks", completeRoleTasks, "number"],
  ["updateTaskPriority", updateTaskPriority, '"type":"null"'],
  ["logActivity", logActivity, '"type":"null"'],
  ["reserveTaskExecution", reserveTaskExecution, "allowed"],
] as const;

const INTERNAL_ACTION_CONTRACTS = [
  ["runCTOSpecGeneration", runCTOSpecGeneration, '"type":"null"'],
  ["runExecutionFromRecord", runExecutionFromRecord, '"type":"null"'],
  ["cancelTask", cancelTask, '"type":"null"'],
] as const;

const INTERNAL_QUERY_CONTRACTS = [
  ["canDispatchTask", canDispatchTask, "boolean"],
  ["getDispatchableTasks", getDispatchableTasks, "autopilotWorkItems"],
  ["getOrganization", getOrganization, "organizations"],
  ["getPendingTasks", getPendingTasks, "autopilotWorkItems"],
  ["getTask", getTask, "autopilotWorkItems"],
  ["getSubtasks", getSubtasks, "autopilotWorkItems"],
  ["getTasksByOrg", getTasksByOrg, "autopilotWorkItems"],
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
