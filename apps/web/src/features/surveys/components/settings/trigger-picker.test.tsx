import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TriggerPicker } from "./trigger-picker";

describe("TriggerPicker", () => {
  it("shows the current trigger as a checked radio and reports a new pick", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <>
        <span id="trigger-label">Trigger</span>
        <TriggerPicker
          labelledBy="trigger-label"
          onChange={onChange}
          value="manual"
        />
      </>
    );

    expect(
      screen.getByRole("radiogroup", { name: "Trigger" })
    ).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(
      radios.filter((radio) => radio.getAttribute("aria-checked") === "true")
    ).toHaveLength(1);

    await user.click(screen.getByText("Exit intent"));

    expect(onChange).toHaveBeenCalledWith("exit_intent", expect.anything());
  });
});
