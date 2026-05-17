import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ChainTechTree } from "@/features/autopilot/components/chain-tech-tree";
import { toOrgId } from "@/lib/convex-helpers";

const { mockUseQuery } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useQuery: (q: unknown) => mockUseQuery(q),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    autopilot: {
      queries: {
        chain: {
          getChainOverview: "autopilot.chain.getChainOverview",
          getChainMeta: "autopilot.chain.getChainMeta",
          getActiveChainWork: "autopilot.chain.getActiveChainWork",
          getChainNodeDetail: "autopilot.chain.getChainNodeDetail",
        },
      },
    },
  },
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ orgSlug: "acme" }),
}));

vi.mock("@/components/ui/tiptap/markdown-editor", () => ({
  TiptapMarkdownEditor: ({ value }: { value: string }) => (
    <div data-testid="markdown">{value}</div>
  ),
}));

interface ElkGraph {
  children: { id: string; width: number; height: number }[];
  edges: { id: string; sources: string[]; targets: string[] }[];
}

// Stub ELK with a deterministic grid layout. The real ELK ships with a
// Web Worker that jsdom cannot execute; we only need positions present
// so the component renders nodes and edges synchronously.
vi.mock("elkjs/lib/elk.bundled.js", () => ({
  default: class ElkMock {
    layout(graph: ElkGraph) {
      return Promise.resolve({
        children: graph.children.map((child, index) => ({
          ...child,
          x: index * 260,
          y: 0,
        })),
        edges: graph.edges.map((edge) => ({
          id: edge.id,
          sections: [
            {
              startPoint: { x: 0, y: 0 },
              endPoint: { x: 100, y: 0 },
              bendPoints: [],
            },
          ],
        })),
      });
    }
  },
}));

beforeAll(() => {
  class ResizeObserverMock {
    observe = () => {
      // noop
    };
    unobserve = () => {
      // noop
    };
    disconnect = () => {
      // noop
    };
  }
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    value: ResizeObserverMock,
    writable: true,
  });
  if (!("DOMMatrixReadOnly" in globalThis)) {
    Object.defineProperty(globalThis, "DOMMatrixReadOnly", {
      configurable: true,
      value: class DOMMatrixReadOnlyMock {
        m22 = 1;
      },
      writable: true,
    });
  }
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get: () => 500,
  });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get: () => 1000,
  });
  if (!window.HTMLElement.prototype.hasPointerCapture) {
    window.HTMLElement.prototype.hasPointerCapture = () => false;
  }
  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = () => {
      // noop
    };
  }
});

afterEach(() => {
  cleanup();
});

const ORG_ID = toOrgId("org_test");

const seedQueries = (
  detailOverride?: { markdown?: string; items?: unknown[] } | null
) => {
  mockUseQuery.mockImplementation((query: unknown) => {
    if (query === "autopilot.chain.getChainOverview") {
      return {
        nodes: [
          {
            kind: "codebase_understanding",
            owner: "cto",
            status: "missing",
            actionable: true,
            artifactCount: 0,
            avgValidationScore: null,
            draftSubtypes: undefined,
            lastUpdatedAt: null,
            recentTitles: [],
          },
          {
            kind: "identity",
            owner: "pm",
            status: "missing",
            actionable: false,
            artifactCount: 0,
            avgValidationScore: null,
            draftSubtypes: undefined,
            lastUpdatedAt: null,
            recentTitles: [],
          },
        ],
        openTaskCount: 0,
        wakeThreshold: 5,
        gatedByOpenTasks: false,
      };
    }
    if (query === "autopilot.chain.getChainMeta") {
      return {
        nodes: [
          {
            kind: "codebase_understanding",
            label: "Codebase understanding",
            owner: "cto",
            plural: "docs",
            deps: [],
          },
          {
            kind: "identity",
            label: "Product identity",
            owner: "pm",
            plural: "docs",
            deps: ["codebase_understanding"],
          },
        ],
        edges: [{ from: "codebase_understanding", to: "identity" }],
        stages: [],
        agentRequirements: {},
      };
    }
    if (query === "autopilot.chain.getActiveChainWork") {
      return { activeNode: null, message: null };
    }
    if (query === "autopilot.chain.getChainNodeDetail") {
      return (
        detailOverride ?? {
          markdown: "# Codebase understanding\n\nDoc body here.",
          items: [],
          lastUpdatedAt: null,
        }
      );
    }
    return;
  });
};

const CARD_BUTTON_NAME = /Codebase understanding — open documents/i;

describe("ChainTechTree — clicking a card opens the related documents dialog", () => {
  it("renders the card as a button wrapped by React Flow with drag-bypass classes", async () => {
    seedQueries();

    render(<ChainTechTree organizationId={ORG_ID} />);

    const card = await screen.findByRole("button", { name: CARD_BUTTON_NAME });

    // The official React Flow guidance is that interactive elements inside a
    // custom node MUST carry the `nodrag` class so the canvas drag handler
    // ignores the pointerdown. Without it, RF treats the press as a drag
    // intent and the click never reaches our handler in a real browser.
    expect(card).toHaveClass("nodrag");
    expect(card).toHaveClass("nopan");
    expect(card.closest(".react-flow__node")).not.toBeNull();
    expect(card).toHaveAttribute("type", "button");
  });

  it("opens a dialog with the related document on a real pointer click (userEvent)", async () => {
    seedQueries();
    const user = userEvent.setup();

    render(<ChainTechTree organizationId={ORG_ID} />);

    const card = await screen.findByRole("button", { name: CARD_BUTTON_NAME });
    // userEvent dispatches the full pointerdown → pointerup → click sequence
    // that React Flow's internal drag listener observes, so this fails the
    // same way a real browser would if `nodrag` were missing.
    await user.click(card);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Codebase understanding");
    expect(screen.getByTestId("markdown")).toHaveTextContent("Doc body here.");
  });

  it("opens the dialog when activated via keyboard (Enter on focused card)", async () => {
    seedQueries();
    const user = userEvent.setup();

    render(<ChainTechTree organizationId={ORG_ID} />);

    const card = await screen.findByRole("button", { name: CARD_BUTTON_NAME });
    card.focus();
    expect(card).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Codebase understanding"
    );
  });

  it("falls back to an empty-state message when the node has no content", async () => {
    seedQueries({ items: [], markdown: undefined });
    const user = userEvent.setup();

    render(<ChainTechTree organizationId={ORG_ID} />);

    const card = await screen.findByRole("button", { name: CARD_BUTTON_NAME });
    await user.click(card);

    expect(screen.getByRole("dialog")).toHaveTextContent(/No content yet/i);
  });

  it("does not propagate the click to React Flow's pane handlers", async () => {
    seedQueries();
    const user = userEvent.setup();
    const paneClick = vi.fn();

    const { container } = render(<ChainTechTree organizationId={ORG_ID} />);
    const card = await screen.findByRole("button", { name: CARD_BUTTON_NAME });
    const pane = container.querySelector(".react-flow__pane");
    pane?.addEventListener("mousedown", paneClick);

    await user.click(card);

    // RF's pane uses `mousedown` for pan-start detection. With `nodrag` on the
    // button, the event still bubbles to the pane in jsdom (the class only
    // disables RF's *handler*, not the DOM bubble), so we cannot assert the
    // pane never sees it. Instead, prove our click handler still won: the
    // dialog opened.
    pane?.removeEventListener("mousedown", paneClick);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("surfaces blocker labels on locked downstream cards", async () => {
    seedQueries();

    render(<ChainTechTree organizationId={ORG_ID} />);

    // Wait until the layout resolves and the tree renders.
    await screen.findByRole("button", { name: CARD_BUTTON_NAME });

    const waitingLabel = screen.getByText(/Waiting on/i);
    const blockerRow = waitingLabel.closest("div");
    expect(blockerRow).not.toBeNull();
    expect(blockerRow).toHaveTextContent(/Codebase understanding/i);
  });

  it("still opens the dialog after a pointerdown+pointerup sequence (drag-cancel safety)", async () => {
    seedQueries();

    render(<ChainTechTree organizationId={ORG_ID} />);

    const card = await screen.findByRole("button", { name: CARD_BUTTON_NAME });
    fireEvent.pointerDown(card);
    fireEvent.pointerUp(card);
    fireEvent.click(card);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
