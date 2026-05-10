import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { toId } from "@/lib/convex-helpers";
import { IncidentCard } from "./card";

const baseIncident = {
  _id: toId("statusIncidents", "incident_123"),
  affectedMonitors: [{ name: "API" }],
  severity: "major",
  startedAt: Date.now() - 60_000,
  status: "investigating",
  title: "API latency",
  updates: [],
} satisfies Parameters<typeof IncidentCard>[0]["incident"];

describe("IncidentCard", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("posts updates with the latest incident status after a live refresh", () => {
    const onPostUpdate = vi.fn();
    const { rerender } = render(
      <IncidentCard incident={baseIncident} onPostUpdate={onPostUpdate} />
    );

    rerender(
      <IncidentCard
        incident={{ ...baseIncident, status: "monitoring" }}
        onPostUpdate={onPostUpdate}
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Post Update" })[0]);
    fireEvent.change(screen.getByPlaceholderText("What's the latest?"), {
      target: { value: "Latency is recovering." },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Post Update" })[1]);

    expect(onPostUpdate).toHaveBeenCalledWith(
      baseIncident._id,
      "monitoring",
      "Latency is recovering."
    );
  });
});
