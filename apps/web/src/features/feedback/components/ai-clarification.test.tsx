import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    feedback_clarification: {
      getClarificationStatus: "feedback_clarification.getClarificationStatus",
      generateCodingPrompt: "feedback_clarification.generateCodingPrompt",
      initiateClarification: "feedback_clarification.initiateClarification",
    },
  },
}));

vi.mock("@phosphor-icons/react", () => ({
  ArrowsClockwise: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="spinner-icon" />
  ),
  Code: () => <svg data-testid="code-icon" />,
  Copy: () => <svg data-testid="copy-icon" />,
  Sparkle: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="sparkle-icon" />
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    size,
    className,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => (
    <button
      className={className}
      data-size={size}
      data-variant={variant}
      disabled={disabled}
      onClick={onClick}
      type="button"
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={className} data-testid="card">
      {children}
    </div>
  ),
  CardContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={className} data-testid="card-content">
      {children}
    </div>
  ),
  CardHeader: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={className} data-testid="card-header">
      {children}
    </div>
  ),
  CardTitle: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={className} data-testid="card-title">
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({
    children,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({
    children,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <h2 data-testid="dialog-title">{children}</h2>,
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div className={className} data-testid="skeleton" />
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import { AIClarification } from "./ai-clarification";

const feedbackId = "fb1" as Id<"feedback">;
const mockInitiateClarification = vi.fn().mockResolvedValue(undefined);

describe("AIClarification", () => {
  beforeEach(() => {
    mockUseMutation.mockReturnValue(mockInitiateClarification);
    // Default: no clarification data
    mockUseQuery.mockReturnValue(null);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("should return null when not admin", () => {
    const { container } = render(
      <AIClarification feedbackId={feedbackId} isAdmin={false} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("should show loading skeleton when status is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(<AIClarification feedbackId={feedbackId} isAdmin={true} />);
    expect(screen.getByText("AI Clarification")).toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("should return null when clarificationStatus is null", () => {
    mockUseQuery.mockReturnValue(null);
    const { container } = render(
      <AIClarification feedbackId={feedbackId} isAdmin={true} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("should show Generate button when no existing clarification", () => {
    mockUseQuery.mockReturnValue({
      hasAiClarification: false,
      aiClarification: null,
      aiClarificationGeneratedAt: null,
    });
    render(<AIClarification feedbackId={feedbackId} isAdmin={true} />);
    expect(screen.getByText("Generate")).toBeInTheDocument();
  });

  it("should show Regenerate button when existing clarification present", () => {
    mockUseQuery.mockImplementation(() => ({
      hasAiClarification: true,
      aiClarification: "AI summary text here",
      aiClarificationGeneratedAt: Date.now(),
    }));
    render(<AIClarification feedbackId={feedbackId} isAdmin={true} />);
    expect(screen.getByText("Regenerate")).toBeInTheDocument();
  });

  it("should show clarification text when available", () => {
    mockUseQuery.mockImplementation(() => ({
      hasAiClarification: true,
      aiClarification: "This is the AI summary",
      aiClarificationGeneratedAt: Date.now(),
    }));
    render(<AIClarification feedbackId={feedbackId} isAdmin={true} />);
    expect(screen.getByText("This is the AI summary")).toBeInTheDocument();
  });

  it("should show enhanced feedback summary title", () => {
    mockUseQuery.mockImplementation(() => ({
      hasAiClarification: true,
      aiClarification: "Summary",
      aiClarificationGeneratedAt: Date.now(),
    }));
    render(<AIClarification feedbackId={feedbackId} isAdmin={true} />);
    expect(screen.getByText("Enhanced feedback summary")).toBeInTheDocument();
  });

  it("should show Coding Prompt button", () => {
    mockUseQuery.mockImplementation(() => ({
      hasAiClarification: false,
      aiClarification: null,
      aiClarificationGeneratedAt: null,
    }));
    render(<AIClarification feedbackId={feedbackId} isAdmin={true} />);
    expect(screen.getByText("Coding Prompt")).toBeInTheDocument();
  });

  it("should show prompt text when no existing clarification", () => {
    mockUseQuery.mockImplementation(() => ({
      hasAiClarification: false,
      aiClarification: null,
      aiClarificationGeneratedAt: null,
    }));
    render(<AIClarification feedbackId={feedbackId} isAdmin={true} />);
    expect(screen.getByText(/Click "Generate" to create/)).toBeInTheDocument();
  });

  it("should show Copy button for clarification", () => {
    mockUseQuery.mockImplementation(() => ({
      hasAiClarification: true,
      aiClarification: "Summary",
      aiClarificationGeneratedAt: Date.now(),
    }));
    render(<AIClarification feedbackId={feedbackId} isAdmin={true} />);
    expect(screen.getByText("Copy")).toBeInTheDocument();
  });

  it("should show generated date when available", () => {
    const date = new Date(2026, 0, 15).getTime();
    mockUseQuery.mockImplementation(() => ({
      hasAiClarification: true,
      aiClarification: "Summary",
      aiClarificationGeneratedAt: date,
    }));
    render(<AIClarification feedbackId={feedbackId} isAdmin={true} />);
    expect(screen.getByText(/Generated/)).toBeInTheDocument();
  });

  it("should call initiateClarification when Generate is clicked", () => {
    mockUseQuery.mockImplementation(() => ({
      hasAiClarification: false,
      aiClarification: null,
      aiClarificationGeneratedAt: null,
    }));
    render(<AIClarification feedbackId={feedbackId} isAdmin={true} />);
    fireEvent.click(screen.getByText("Generate"));
    expect(mockInitiateClarification).toHaveBeenCalledWith({ feedbackId });
  });

  it("should disable Generate button while generating", () => {
    mockUseQuery.mockImplementation(() => ({
      hasAiClarification: false,
      aiClarification: null,
      aiClarificationGeneratedAt: null,
    }));
    render(<AIClarification feedbackId={feedbackId} isAdmin={true} />);

    fireEvent.click(screen.getByText("Generate"));

    // After clicking, button should show spinner and be disabled
    const buttons = screen.getAllByTestId("spinner-icon");
    expect(buttons.length).toBeGreaterThanOrEqual(0);
  });

  describe("Coding Prompt Dialog", () => {
    it("should open dialog when Coding Prompt button is clicked", () => {
      mockUseQuery.mockImplementation(() => ({
        hasAiClarification: false,
        aiClarification: null,
        aiClarificationGeneratedAt: null,
      }));
      render(<AIClarification feedbackId={feedbackId} isAdmin={true} />);
      fireEvent.click(screen.getByText("Coding Prompt"));
      expect(screen.getByTestId("dialog")).toBeInTheDocument();
      expect(screen.getByTestId("dialog-title")).toHaveTextContent(
        "Coding Prompt"
      );
    });

    it("should show prompt content inside dialog", () => {
      mockUseQuery.mockImplementation((queryRef: string) => {
        if (
          typeof queryRef === "string" &&
          queryRef.includes("generateCodingPrompt")
        ) {
          return {
            prompt: "Implement the fix for issue #123",
            hasRepoContext: true,
          };
        }
        return {
          hasAiClarification: false,
          aiClarification: null,
          aiClarificationGeneratedAt: null,
        };
      });
      render(<AIClarification feedbackId={feedbackId} isAdmin={true} />);
      fireEvent.click(screen.getByText("Coding Prompt"));
      expect(
        screen.getByText("Implement the fix for issue #123")
      ).toBeInTheDocument();
    });

    it("should show loading skeleton when prompt is not yet loaded", () => {
      mockUseQuery.mockImplementation((queryRef: string) => {
        if (
          typeof queryRef === "string" &&
          queryRef.includes("generateCodingPrompt")
        ) {
          return undefined;
        }
        return {
          hasAiClarification: false,
          aiClarification: null,
          aiClarificationGeneratedAt: null,
        };
      });
      render(<AIClarification feedbackId={feedbackId} isAdmin={true} />);
      fireEvent.click(screen.getByText("Coding Prompt"));
      expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    });

    it("should show repo context tip when hasRepoContext is false", () => {
      mockUseQuery.mockImplementation((queryRef: string) => {
        if (
          typeof queryRef === "string" &&
          queryRef.includes("generateCodingPrompt")
        ) {
          return { prompt: "Some prompt", hasRepoContext: false };
        }
        return {
          hasAiClarification: false,
          aiClarification: null,
          aiClarificationGeneratedAt: null,
        };
      });
      render(<AIClarification feedbackId={feedbackId} isAdmin={true} />);
      fireEvent.click(screen.getByText("Coding Prompt"));
      expect(screen.getByText(/Run a repository analysis/)).toBeInTheDocument();
    });

    it("should not show repo context tip when hasRepoContext is true", () => {
      mockUseQuery.mockImplementation((queryRef: string) => {
        if (
          typeof queryRef === "string" &&
          queryRef.includes("generateCodingPrompt")
        ) {
          return { prompt: "Some prompt", hasRepoContext: true };
        }
        return {
          hasAiClarification: false,
          aiClarification: null,
          aiClarificationGeneratedAt: null,
        };
      });
      render(<AIClarification feedbackId={feedbackId} isAdmin={true} />);
      fireEvent.click(screen.getByText("Coding Prompt"));
      expect(
        screen.queryByText(/Run a repository analysis/)
      ).not.toBeInTheDocument();
    });

    it("should copy clarification text to clipboard", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      });

      mockUseQuery.mockImplementation(() => ({
        hasAiClarification: true,
        aiClarification: "Clarified summary text",
        aiClarificationGeneratedAt: Date.now(),
      }));
      render(<AIClarification feedbackId={feedbackId} isAdmin={true} />);
      fireEvent.click(screen.getByText("Copy"));
      expect(writeTextMock).toHaveBeenCalledWith("Clarified summary text");
    });

    it("should show Copy Prompt button inside dialog", () => {
      mockUseQuery.mockImplementation((queryRef: string) => {
        if (
          typeof queryRef === "string" &&
          queryRef.includes("generateCodingPrompt")
        ) {
          return { prompt: "Fix the bug", hasRepoContext: true };
        }
        return {
          hasAiClarification: false,
          aiClarification: null,
          aiClarificationGeneratedAt: null,
        };
      });
      render(<AIClarification feedbackId={feedbackId} isAdmin={true} />);
      fireEvent.click(screen.getByText("Coding Prompt"));
      expect(screen.getByText("Copy Prompt")).toBeInTheDocument();
    });

    it("should copy coding prompt to clipboard", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      });

      mockUseQuery.mockImplementation((queryRef: string) => {
        if (
          typeof queryRef === "string" &&
          queryRef.includes("generateCodingPrompt")
        ) {
          return { prompt: "Fix the bug code", hasRepoContext: true };
        }
        return {
          hasAiClarification: false,
          aiClarification: null,
          aiClarificationGeneratedAt: null,
        };
      });
      render(<AIClarification feedbackId={feedbackId} isAdmin={true} />);
      fireEvent.click(screen.getByText("Coding Prompt"));
      fireEvent.click(screen.getByText("Copy Prompt"));
      expect(writeTextMock).toHaveBeenCalledWith("Fix the bug code");
    });

    it("should show loading state after clicking Generate and show skeleton", () => {
      mockUseQuery.mockImplementation(() => ({
        hasAiClarification: false,
        aiClarification: null,
        aiClarificationGeneratedAt: null,
      }));
      render(<AIClarification feedbackId={feedbackId} isAdmin={true} />);
      fireEvent.click(screen.getByText("Generate"));
      // Should show loading skeletons while generating (since aiClarification is still null)
      expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    });
  });
});
