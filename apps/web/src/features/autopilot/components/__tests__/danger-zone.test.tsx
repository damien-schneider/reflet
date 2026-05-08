import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DangerZone } from "@/features/autopilot/components/settings/danger-zone";

afterEach(() => {
  cleanup();
});

describe("DangerZone", () => {
  it("lists every backend reset scope item before confirming deletion", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();

    render(
      <DangerZone
        isResetting={false}
        onReset={onReset}
        resetScope={[
          {
            title: "Execution history",
            description: "Tasks, initiatives, stories, and agent runs.",
            items: ["Tasks", "Runs"],
          },
          {
            title: "Knowledge and context",
            description: "Documents, knowledge docs, and versions.",
            items: ["Documents", "Knowledge versions"],
          },
        ]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Reset All Data" }));

    expect(screen.getByText("Execution history")).toBeTruthy();
    expect(screen.getByText("Tasks")).toBeTruthy();
    expect(screen.getByText("Runs")).toBeTruthy();
    expect(screen.getByText("Knowledge and context")).toBeTruthy();
    expect(screen.getByText("Documents")).toBeTruthy();
    expect(screen.getByText("Knowledge versions")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Reset Everything" }));

    expect(onReset).toHaveBeenCalledOnce();
  });
});
