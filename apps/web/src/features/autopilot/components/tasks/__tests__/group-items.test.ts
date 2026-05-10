import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import { describe, expect, it } from "vitest";

import { groupItems } from "../group-items";

type WorkItem = Doc<"autopilotWorkItems">;

function makeItem(overrides: Partial<WorkItem>): WorkItem {
  return {
    _creationTime: 1,
    _id: `id-${Math.random()}` as unknown as WorkItem["_id"],
    assignedAgent: "system",
    createdAt: 1,
    description: "",
    organizationId: "org" as unknown as WorkItem["organizationId"],
    priority: "medium",
    status: "todo",
    title: "",
    type: "task",
    updatedAt: 1,
    ...overrides,
  } as WorkItem;
}

describe("groupItems", () => {
  it("returns a single all-bucket when groupBy is none", () => {
    const items = [makeItem({ status: "todo" }), makeItem({ status: "done" })];
    const groups = groupItems(items, "none");
    expect(groups).toHaveLength(1);
    expect(groups[0]?.key).toBe("all");
    expect(groups[0]?.items).toHaveLength(2);
  });

  it("partitions items by status using stable order", () => {
    const items = [
      makeItem({ status: "done" }),
      makeItem({ status: "todo" }),
      makeItem({ status: "in_progress" }),
      makeItem({ status: "todo" }),
    ];
    const groups = groupItems(items, "status");
    const keys = groups.map((g) => g.key);
    expect(keys).toEqual(["todo", "in_progress", "done"]);
    expect(groups[0]?.items).toHaveLength(2);
  });

  it("partitions items by priority", () => {
    const items = [
      makeItem({ priority: "low" }),
      makeItem({ priority: "high" }),
      makeItem({ priority: "high" }),
      makeItem({ priority: "critical" }),
    ];
    const groups = groupItems(items, "priority");
    expect(groups.map((g) => g.key)).toEqual(["critical", "high", "low"]);
    expect(groups.find((g) => g.key === "high")?.items).toHaveLength(2);
  });

  it("buckets items without an assignee under Unassigned", () => {
    const items = [
      makeItem({ assigneeUserId: "u1" }),
      makeItem({ assigneeUserId: undefined }),
    ];
    const groups = groupItems(items, "assignee");
    const keys = new Set(groups.map((g) => g.key));
    expect(keys.has("u1")).toBe(true);
    const unassigned = groups.find((g) => g.label === "Unassigned");
    expect(unassigned?.items).toHaveLength(1);
  });
});
