"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";

import { Skeleton } from "@/components/ui/skeleton";
import { H2 } from "@/components/ui/typography";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";

export default function AutopilotCostsPage() {
  const { organizationId } = useAutopilotContext();

  const stats = useQuery(api.autopilot.queries.getDashboardStats, {
    organizationId,
  });

  const revenue = useQuery(api.autopilot.queries.getLatestRevenue, {
    organizationId,
  });

  const revenueHistory = useQuery(api.autopilot.queries.getRevenueHistory, {
    organizationId,
    limit: 30,
  });

  const tasks = useQuery(api.autopilot.queries.listTasks, {
    organizationId,
    status: "completed",
  });

  if (stats === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton
              className="h-24 w-full rounded-lg"
              key={`skel-${String(i)}`}
            />
          ))}
        </div>
      </div>
    );
  }

  // Compute per-agent cost breakdown from completed tasks
  const agentCosts = new Map<string, { cost: number; tasks: number }>();
  if (tasks) {
    for (const task of tasks) {
      const cost = task.estimatedCostUsd ?? 0;
      const existing = agentCosts.get(task.assignedAgent) ?? {
        cost: 0,
        tasks: 0,
      };
      agentCosts.set(task.assignedAgent, {
        cost: existing.cost + cost,
        tasks: existing.tasks + 1,
      });
    }
  }

  const totalCost =
    tasks?.reduce((sum, t) => sum + (t.estimatedCostUsd ?? 0), 0) ?? 0;

  return (
    <div className="space-y-8">
      <H2 variant="card">Cost Tracking</H2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">Today&apos;s Cost</p>
          <p className="mt-1 font-semibold text-2xl">
            ${(stats.costUsedTodayUsd ?? 0).toFixed(2)}
          </p>
          {stats.dailyCostCapUsd !== undefined && (
            <p className="mt-1 text-muted-foreground text-xs">
              Cap: ${stats.dailyCostCapUsd.toFixed(2)}
            </p>
          )}
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">Total Spent</p>
          <p className="mt-1 font-semibold text-2xl">${totalCost.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">Tasks Completed</p>
          <p className="mt-1 font-semibold text-2xl">
            {stats.completedTaskCount}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">Avg Cost/Task</p>
          <p className="mt-1 font-semibold text-2xl">
            $
            {stats.completedTaskCount > 0
              ? (totalCost / stats.completedTaskCount).toFixed(3)
              : "0.00"}
          </p>
        </div>
      </div>

      <section>
        <h3 className="mb-3 font-semibold text-lg">Per-Agent Breakdown</h3>
        {agentCosts.size === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
            No cost data yet
          </div>
        ) : (
          <div className="space-y-2">
            {[...agentCosts.entries()]
              .sort(([, a], [, b]) => b.cost - a.cost)
              .map(([agent, data]) => (
                <div
                  className="flex items-center justify-between rounded-lg border p-3"
                  key={agent}
                >
                  <div>
                    <p className="font-medium text-sm capitalize">{agent}</p>
                    <p className="text-muted-foreground text-xs">
                      {data.tasks} tasks
                    </p>
                  </div>
                  <p className="font-medium text-sm">${data.cost.toFixed(3)}</p>
                </div>
              ))}
          </div>
        )}
      </section>

      {revenue && (
        <section>
          <h3 className="mb-3 font-semibold text-lg">Revenue</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">MRR</p>
              <p className="mt-1 font-semibold text-2xl">
                ${revenue.mrr.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">ARR</p>
              <p className="mt-1 font-semibold text-2xl">
                ${revenue.arr.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">Active Subs</p>
              <p className="mt-1 font-semibold text-2xl">
                {revenue.activeSubscriptions}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">Churn Rate</p>
              <p className="mt-1 font-semibold text-2xl">
                {(revenue.churnRate ?? 0).toFixed(1)}%
              </p>
            </div>
          </div>
        </section>
      )}

      {revenueHistory && revenueHistory.length > 0 && (
        <section>
          <h3 className="mb-3 font-semibold text-lg">Revenue History</h3>
          <div className="max-h-64 overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b bg-background">
                <tr>
                  <th className="p-3 text-left font-medium">Date</th>
                  <th className="p-3 text-right font-medium">MRR</th>
                  <th className="p-3 text-right font-medium">ARR</th>
                  <th className="p-3 text-right font-medium">Subs</th>
                </tr>
              </thead>
              <tbody>
                {revenueHistory.map((snap) => (
                  <tr className="border-b last:border-0" key={snap._id}>
                    <td className="p-3">{snap.snapshotDate}</td>
                    <td className="p-3 text-right">
                      ${snap.mrr.toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      ${snap.arr.toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      {snap.activeSubscriptions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
