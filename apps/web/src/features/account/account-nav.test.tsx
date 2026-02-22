import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

vi.mock("@phosphor-icons/react", () => ({
  Bell: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
  Envelope: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
  User: ({ className }: { className?: string }) => (
    <svg className={className} />
  ),
}));

import { AccountNav } from "./account-nav";

afterEach(cleanup);

describe("AccountNav", () => {
  it("renders all nav items", () => {
    render(<AccountNav activeTab="profile" onTabChange={vi.fn()} />);
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Password")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  it("calls onTabChange when a tab is clicked", async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    render(<AccountNav activeTab="profile" onTabChange={onTabChange} />);

    await user.click(screen.getByText("Email"));
    expect(onTabChange).toHaveBeenCalledWith("email");
  });

  it("calls onTabChange with correct id for each tab", async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    render(<AccountNav activeTab="profile" onTabChange={onTabChange} />);

    await user.click(screen.getByText("Password"));
    expect(onTabChange).toHaveBeenCalledWith("password");

    await user.click(screen.getByText("Notifications"));
    expect(onTabChange).toHaveBeenCalledWith("notifications");

    await user.click(screen.getByText("Profile"));
    expect(onTabChange).toHaveBeenCalledWith("profile");
  });

  it("applies active styling to the active tab", () => {
    const { container } = render(
      <AccountNav activeTab="email" onTabChange={vi.fn()} />
    );
    const buttons = container.querySelectorAll("button");
    // Email is the second button
    expect(buttons[1].className).toContain("bg-accent");
  });

  it("applies inactive styling to non-active tabs", () => {
    const { container } = render(
      <AccountNav activeTab="email" onTabChange={vi.fn()} />
    );
    const buttons = container.querySelectorAll("button");
    // Profile is the first button and should not have bg-accent
    expect(buttons[0].className).toContain("text-muted-foreground");
  });

  it("all buttons have type=button", () => {
    const { container } = render(
      <AccountNav activeTab="profile" onTabChange={vi.fn()} />
    );
    const buttons = container.querySelectorAll("button");
    for (const btn of buttons) {
      expect(btn).toHaveAttribute("type", "button");
    }
  });
});
