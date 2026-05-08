import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LimitSettings } from "@/features/autopilot/components/settings/limit-settings";

afterEach(() => {
  cleanup();
});

function renderLimitSettings({
  onInvalidValue = vi.fn(),
  onUpdate = vi.fn(() => Promise.resolve()),
}: {
  onInvalidValue?: (message: string) => void;
  onUpdate?: (field: string, value: number) => Promise<void>;
} = {}) {
  render(
    <LimitSettings
      dailyCostCapUsd={25}
      disabled={false}
      emailDailyLimit={20}
      maxTasksPerDay={5}
      onInvalidValue={onInvalidValue}
      onUpdate={onUpdate}
    />
  );
  return { onInvalidValue, onUpdate };
}

describe("LimitSettings", () => {
  it("rejects fractional task limits instead of truncating them", async () => {
    const user = userEvent.setup();
    const { onInvalidValue, onUpdate } = renderLimitSettings();
    const maxTasksInput = screen.getByLabelText("Maximum tasks per day");

    await user.clear(maxTasksInput);
    await user.type(maxTasksInput, "1.9");
    await user.tab();

    expect(onUpdate).not.toHaveBeenCalled();
    expect(onInvalidValue).toHaveBeenCalledWith(
      "Tasks per day must be at least 1"
    );
    expect(maxTasksInput).toHaveValue(5);
  });

  it("restores the saved value when a limit update fails", async () => {
    const user = userEvent.setup();
    const onInvalidValue = vi.fn();
    const onUpdate = vi.fn(() => Promise.reject(new Error("Network failed")));
    renderLimitSettings({ onInvalidValue, onUpdate });
    const emailLimitInput = screen.getByLabelText(
      "Maximum outbound emails per day"
    );

    await user.clear(emailLimitInput);
    await user.type(emailLimitInput, "30");
    await user.tab();

    await waitFor(() => expect(emailLimitInput).toHaveValue(20));
    expect(onUpdate).toHaveBeenCalledWith("emailDailyLimit", 30);
    expect(onInvalidValue).toHaveBeenCalledWith("Failed to save limit");
  });
});
