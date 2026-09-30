import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AccountNav } from "./account-nav";

describe("AccountNav", () => {
  it("renders every section as a tab", () => {
    render(<AccountNav activeTab="profile" onTabChange={vi.fn()} />);
    expect(screen.getAllByRole("tab")).toHaveLength(5);
    expect(screen.getByRole("tab", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Email" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Password" })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Notifications" })
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Devtools" })).toBeInTheDocument();
  });

  it("marks only the active tab as selected", () => {
    render(<AccountNav activeTab="email" onTabChange={vi.fn()} />);
    expect(screen.getByRole("tab", { name: "Email" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("reports the clicked tab", async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    render(<AccountNav activeTab="profile" onTabChange={onTabChange} />);

    await user.click(screen.getByRole("tab", { name: "Password" }));
    expect(onTabChange).toHaveBeenCalledWith("password");

    await user.click(screen.getByRole("tab", { name: "Notifications" }));
    expect(onTabChange).toHaveBeenCalledWith("notifications");
  });

  it("moves between tabs with the arrow keys", async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    render(<AccountNav activeTab="profile" onTabChange={onTabChange} />);

    await user.tab();
    expect(screen.getByRole("tab", { name: "Profile" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Email" })).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onTabChange).toHaveBeenCalledWith("email");
  });
});
