import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@phosphor-icons/react", () => ({
  Smiley: () => <svg data-testid="smiley-icon" />,
}));

vi.mock("@ctrl-ui/react/ui/emoji-picker", () => ({
  EmojiPicker: ({
    children,
    onEmojiSelect,
  }: {
    children: React.ReactNode;
    onEmojiSelect: (emoji: { emoji: string }) => void;
  }) => (
    <div>
      {children}
      <button onClick={() => onEmojiSelect({ emoji: "🎉" })} type="button">
        Party popper
      </button>
    </div>
  ),
  EmojiPickerContent: () => null,
  EmojiPickerSearch: () => <input aria-label="Search emoji" />,
}));

vi.mock("@ctrl-ui/react/ui/popover", async () => {
  const { cloneElement, createContext, useContext } = await import("react");
  const OpenContext = createContext<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }>({ onOpenChange: () => undefined, open: false });
  return {
    Popover: ({
      children,
      onOpenChange,
      open,
    }: {
      children: React.ReactNode;
      onOpenChange: (open: boolean) => void;
      open: boolean;
    }) => (
      <OpenContext.Provider value={{ onOpenChange, open }}>
        {children}
      </OpenContext.Provider>
    ),
    PopoverContent: ({ children }: { children: React.ReactNode }) =>
      useContext(OpenContext).open ? <div role="dialog">{children}</div> : null,
    PopoverHeader: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    PopoverTrigger: ({
      children,
      render: trigger,
    }: {
      children: React.ReactNode;
      render: React.ReactElement<{ onClick?: () => void }>;
    }) => {
      const { onOpenChange, open } = useContext(OpenContext);
      return cloneElement(
        trigger,
        { onClick: () => onOpenChange(!open) },
        children
      );
    },
  };
});

vi.mock("@ctrl-ui/react/ui/button", () => ({
  Button: ({
    children,
    iconOnly: _iconOnly,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    iconOnly?: boolean;
  }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

import { EmojiPicker } from "./emoji-picker";

describe("EmojiPicker", () => {
  it("offers to pick an icon when none is set", () => {
    render(<EmojiPicker onChange={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Pick an icon" })
    ).toBeInTheDocument();
    expect(screen.getByTestId("smiley-icon")).toBeInTheDocument();
  });

  it("shows the current icon on the trigger", () => {
    render(<EmojiPicker onChange={vi.fn()} value="🔥" />);

    expect(
      screen.getByRole("button", { name: "Change icon, current 🔥" })
    ).toHaveTextContent("🔥");
  });

  it("reports the picked emoji and closes", () => {
    const onChange = vi.fn();
    render(<EmojiPicker onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Pick an icon" }));
    expect(screen.getByLabelText("Search emoji")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Party popper" }));

    expect(onChange).toHaveBeenCalledWith("🎉");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("removes the current icon", () => {
    const onChange = vi.fn();
    render(<EmojiPicker onChange={onChange} value="🔥" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Change icon, current 🔥" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove icon" }));

    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("offers no removal when no icon is set", () => {
    render(<EmojiPicker onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Pick an icon" }));

    expect(
      screen.queryByRole("button", { name: "Remove icon" })
    ).not.toBeInTheDocument();
  });
});
