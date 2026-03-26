import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/kbd", () => ({
  Kbd: ({ children }: { children: React.ReactNode }) => (
    <kbd data-testid="kbd">{children}</kbd>
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

import { ShortcutHintBar } from "./shortcut-hint-bar";

afterEach(cleanup);

describe("ShortcutHintBar", () => {
  it("renders navigation hints when no conversation is selected", () => {
    render(<ShortcutHintBar hasSelectedConversation={false} visible={true} />);
    expect(screen.getByText("navigate")).toBeInTheDocument();
  });

  it("renders action hints when a conversation is selected", () => {
    render(<ShortcutHintBar hasSelectedConversation={true} visible={true} />);
    expect(screen.getByText("reply")).toBeInTheDocument();
    expect(screen.getByText("resolve")).toBeInTheDocument();
  });

  it("is hidden when visible is false", () => {
    const { container } = render(
      <ShortcutHintBar hasSelectedConversation={false} visible={false} />
    );
    expect(container.firstChild).toBeNull();
  });
});
