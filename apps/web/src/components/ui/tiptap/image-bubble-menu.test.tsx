import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@phosphor-icons/react", () => ({
  TextAlignLeft: (props: Record<string, unknown>) => (
    <svg data-testid="icon-align-left" {...props} />
  ),
  TextAlignCenter: (props: Record<string, unknown>) => (
    <svg data-testid="icon-align-center" {...props} />
  ),
  TextAlignRight: (props: Record<string, unknown>) => (
    <svg data-testid="icon-align-right" {...props} />
  ),
}));

const createMockEditor = (overrides: Record<string, unknown> = {}) => {
  const mockRun = vi.fn();
  const mockUpdateAttributes = vi.fn(() => ({ run: mockRun }));
  const mockFocus = vi.fn(() => ({ updateAttributes: mockUpdateAttributes }));
  const mockChain = vi.fn(() => ({ focus: mockFocus }));

  return {
    chain: mockChain,
    isActive: vi.fn(() => false),
    getAttributes: vi.fn(() => ({ align: "center" })),
    on: vi.fn(),
    off: vi.fn(),
    view: {
      state: { selection: { from: 0 } },
      dom: Object.assign(document.createElement("div"), {
        getBoundingClientRect: () => new DOMRect(0, 0, 800, 600),
      }),
      domAtPos: vi.fn(() => ({
        node: document.createElement("div"),
      })),
    },
    _mockRun: mockRun,
    _mockUpdateAttributes: mockUpdateAttributes,
    ...overrides,
  };
};

describe("ImageBubbleMenu", () => {
  let ImageBubbleMenu: typeof import("./image-bubble-menu").ImageBubbleMenu;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("./image-bubble-menu");
    ImageBubbleMenu = mod.ImageBubbleMenu;
  });

  afterEach(() => {
    cleanup();
  });

  it("renders nothing when image is not active", () => {
    const editor = createMockEditor({
      isActive: vi.fn(() => false),
    });

    const { container } = render(<ImageBubbleMenu editor={editor as never} />);

    expect(
      container.querySelector(".tiptap-image-bubble-menu")
    ).not.toBeInTheDocument();
  });

  it("renders alignment buttons when image is active", () => {
    const editor = createMockEditor({
      isActive: vi.fn(() => true),
    });

    render(<ImageBubbleMenu editor={editor as never} />);

    expect(screen.getByTitle("Align left")).toBeInTheDocument();
    expect(screen.getByTitle("Align center")).toBeInTheDocument();
    expect(screen.getByTitle("Align right")).toBeInTheDocument();
  });

  it("renders alignment icons", () => {
    const editor = createMockEditor({
      isActive: vi.fn(() => true),
    });

    render(<ImageBubbleMenu editor={editor as never} />);

    expect(screen.getByTestId("icon-align-left")).toBeInTheDocument();
    expect(screen.getByTestId("icon-align-center")).toBeInTheDocument();
    expect(screen.getByTestId("icon-align-right")).toBeInTheDocument();
  });

  it("highlights center button by default", () => {
    const editor = createMockEditor({
      isActive: vi.fn(() => true),
      getAttributes: vi.fn(() => ({ align: "center" })),
    });

    render(<ImageBubbleMenu editor={editor as never} />);

    const centerButton = screen.getByTitle("Align center");
    expect(centerButton.className).toContain("bg-muted");
    expect(centerButton.className).toContain("text-primary");
  });

  it("calls setAlignment with left when left button clicked", () => {
    const editor = createMockEditor({
      isActive: vi.fn(() => true),
    });

    render(<ImageBubbleMenu editor={editor as never} />);

    fireEvent.click(screen.getByTitle("Align left"));
    expect(editor.chain).toHaveBeenCalled();
    expect(editor._mockUpdateAttributes).toHaveBeenCalledWith("image", {
      align: "left",
    });
    expect(editor._mockRun).toHaveBeenCalled();
  });

  it("calls setAlignment with right when right button clicked", () => {
    const editor = createMockEditor({
      isActive: vi.fn(() => true),
    });

    render(<ImageBubbleMenu editor={editor as never} />);

    fireEvent.click(screen.getByTitle("Align right"));
    expect(editor._mockUpdateAttributes).toHaveBeenCalledWith("image", {
      align: "right",
    });
  });

  it("calls setAlignment with center when center button clicked", () => {
    const editor = createMockEditor({
      isActive: vi.fn(() => true),
    });

    render(<ImageBubbleMenu editor={editor as never} />);

    fireEvent.click(screen.getByTitle("Align center"));
    expect(editor._mockUpdateAttributes).toHaveBeenCalledWith("image", {
      align: "center",
    });
  });

  it("registers selectionUpdate and transaction listeners", () => {
    const editor = createMockEditor({
      isActive: vi.fn(() => false),
    });

    render(<ImageBubbleMenu editor={editor as never} />);

    expect(editor.on).toHaveBeenCalledWith(
      "selectionUpdate",
      expect.any(Function)
    );
    expect(editor.on).toHaveBeenCalledWith("transaction", expect.any(Function));
  });

  it("cleans up listeners on unmount", () => {
    const editor = createMockEditor({
      isActive: vi.fn(() => false),
    });

    const { unmount } = render(<ImageBubbleMenu editor={editor as never} />);

    unmount();

    expect(editor.off).toHaveBeenCalledWith(
      "selectionUpdate",
      expect.any(Function)
    );
    expect(editor.off).toHaveBeenCalledWith(
      "transaction",
      expect.any(Function)
    );
  });

  it("defaults to center when align attribute is invalid", () => {
    const editor = createMockEditor({
      isActive: vi.fn(() => true),
      getAttributes: vi.fn(() => ({ align: "invalid" })),
    });

    render(<ImageBubbleMenu editor={editor as never} />);

    const centerButton = screen.getByTitle("Align center");
    expect(centerButton.className).toContain("bg-muted");
  });

  it("positions menu based on image element bounding rect", () => {
    const imgElement = document.createElement("img");
    Object.defineProperty(imgElement, "getBoundingClientRect", {
      value: () => new DOMRect(100, 200, 300, 150),
    });

    const parentDiv = document.createElement("div");
    parentDiv.appendChild(imgElement);

    const editor = createMockEditor({
      isActive: vi.fn(() => true),
      view: {
        state: { selection: { from: 0 } },
        dom: Object.assign(document.createElement("div"), {
          getBoundingClientRect: () => new DOMRect(0, 0, 800, 600),
        }),
        domAtPos: vi.fn(() => ({
          node: parentDiv,
        })),
      },
    });

    render(<ImageBubbleMenu editor={editor as never} />);

    const menu = document.querySelector(".tiptap-image-bubble-menu");
    expect(menu).toBeInTheDocument();
    // The menu should have style props set
    expect(menu).toHaveStyle({ top: "160px", left: "250px" });
  });
});
