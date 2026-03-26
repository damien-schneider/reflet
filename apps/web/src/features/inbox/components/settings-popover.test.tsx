import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverTrigger: ({
    children,
    render: Render,
    ...props
  }: {
    children: React.ReactNode;
    render?: React.ReactElement;
  }) => (
    <button data-testid="popover-trigger" type="button" {...props}>
      {children}
    </button>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
  PopoverHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverTitle: ({ children }: { children: React.ReactNode }) => (
    <h4>{children}</h4>
  ),
  PopoverDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    disabled,
    id,
  }: {
    checked: boolean;
    onCheckedChange: (v: boolean) => void;
    disabled?: boolean;
    id?: string;
  }) => (
    <button
      aria-checked={checked}
      data-testid="support-toggle"
      disabled={disabled}
      id={id}
      onClick={() => onCheckedChange(!checked)}
      role="switch"
      type="button"
    />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <span {...props}>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <button {...props}>{children}</button>,
}));

vi.mock("@phosphor-icons/react", () => ({
  Gear: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="gear-icon" />
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

import { SettingsPopover } from "./settings-popover";

afterEach(cleanup);

describe("SettingsPopover", () => {
  it("renders a gear trigger button", () => {
    render(
      <SettingsPopover
        isSaving={false}
        onToggle={vi.fn()}
        supportEnabled={false}
      />
    );
    expect(screen.getByTestId("gear-icon")).toBeInTheDocument();
  });

  it("shows the toggle with correct state when open", () => {
    render(
      <SettingsPopover
        isSaving={false}
        onToggle={vi.fn()}
        supportEnabled={true}
      />
    );
    const toggle = screen.getByTestId("support-toggle");
    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });

  it("calls onToggle when switch is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <SettingsPopover
        isSaving={false}
        onToggle={onToggle}
        supportEnabled={false}
      />
    );
    await user.click(screen.getByTestId("support-toggle"));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("disables switch when isSaving", () => {
    render(
      <SettingsPopover
        isSaving={true}
        onToggle={vi.fn()}
        supportEnabled={false}
      />
    );
    expect(screen.getByTestId("support-toggle").hasAttribute("disabled")).toBe(
      true
    );
  });
});
