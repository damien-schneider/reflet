import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@ctrl-ui/react/ui/kbd", () => ({
  Kbd: ({ children }: { children: React.ReactNode }) => (
    <kbd data-testid="kbd">{children}</kbd>
  ),
}));

import { ShortcutHintBar } from "./shortcut-hint-bar";

describe("ShortcutHintBar", () => {
  it("renders navigation hints when nothing can be acted on", () => {
    render(<ShortcutHintBar canActOnSelection={false} visible={true} />);
    expect(screen.getByText("navigate")).toBeInTheDocument();
  });

  it("renders action hints when the selected conversation is editable", () => {
    render(<ShortcutHintBar canActOnSelection={true} visible={true} />);
    expect(screen.getByText("reply")).toBeInTheDocument();
    expect(screen.getByText("resolve")).toBeInTheDocument();
  });

  it("is hidden when visible is false", () => {
    const { container } = render(
      <ShortcutHintBar canActOnSelection={false} visible={false} />
    );
    expect(container.firstChild).toBeNull();
  });
});
