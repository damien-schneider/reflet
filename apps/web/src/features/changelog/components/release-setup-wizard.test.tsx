/**
 * @vitest-environment jsdom
 */
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockUseMutation = vi.fn(() => vi.fn());
const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: () => mockUseMutation(),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    organizations: { update: "organizations.update" },
    github: {
      toggleAutoSync: "github.toggleAutoSync",
      getConnection: "github.getConnection",
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@phosphor-icons/react", () => ({
  ArrowLeft: () => <span data-testid="arrow-left" />,
  ArrowRight: () => <span data-testid="arrow-right" />,
  Check: () => <span data-testid="check-icon" />,
  GithubLogo: () => <span data-testid="github-logo" />,
  X: () => <span data-testid="x-icon" />,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-header">{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  SheetDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  SheetClose: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-close">{children}</div>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button disabled={disabled} onClick={onClick} type="button">
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("./wizard-steps/workflow-step", () => ({
  WorkflowStep: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <div data-testid="workflow-step">
      <span>{value}</span>
      <button onClick={() => onChange("automated")} type="button">
        Change to automated
      </button>
    </div>
  ),
}));

vi.mock("./wizard-steps/configure-step", () => ({
  ConfigureStep: () => <div data-testid="configure-step" />,
}));

vi.mock("./wizard-steps/setup-method-step", () => ({
  SetupMethodStep: () => <div data-testid="setup-method-step" />,
}));

import { ReleaseSetupWizard } from "./release-setup-wizard";

const orgId = "org1" as Id<"organizations">;
const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  organizationId: orgId,
  orgSlug: "test-org",
};

describe("ReleaseSetupWizard", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders when open", () => {
    render(<ReleaseSetupWizard {...baseProps} />);
    expect(screen.getByTestId("sheet")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<ReleaseSetupWizard {...baseProps} open={false} />);
    expect(screen.queryByTestId("sheet")).not.toBeInTheDocument();
  });

  it("shows Release Setup title", () => {
    render(<ReleaseSetupWizard {...baseProps} />);
    expect(screen.getByText("Release Setup")).toBeInTheDocument();
  });

  it("shows step 1 of 3 description", () => {
    render(<ReleaseSetupWizard {...baseProps} />);
    expect(
      screen.getByText(/Step 1 of 3 — Configure your release workflow/)
    ).toBeInTheDocument();
  });

  it("renders WorkflowStep on step 1", () => {
    render(<ReleaseSetupWizard {...baseProps} />);
    expect(screen.getByTestId("workflow-step")).toBeInTheDocument();
  });

  it("renders Next button on step 1", () => {
    render(<ReleaseSetupWizard {...baseProps} />);
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  it("renders disabled Back button on step 1", () => {
    render(<ReleaseSetupWizard {...baseProps} />);
    expect(screen.getByText("Back").closest("button")).toBeDisabled();
  });

  it("navigates to step 2 on Next click", () => {
    render(<ReleaseSetupWizard {...baseProps} />);
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByTestId("configure-step")).toBeInTheDocument();
  });

  it("navigates to step 3 and shows Complete Setup", () => {
    render(<ReleaseSetupWizard {...baseProps} />);
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByTestId("setup-method-step")).toBeInTheDocument();
    expect(screen.getByText("Complete Setup")).toBeInTheDocument();
  });

  it("navigates back from step 2 to step 1", () => {
    render(<ReleaseSetupWizard {...baseProps} />);
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByTestId("configure-step")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Back"));
    expect(screen.getByTestId("workflow-step")).toBeInTheDocument();
  });

  it("renders progress bar segments", () => {
    const { container } = render(<ReleaseSetupWizard {...baseProps} />);
    const progressSegments = container.querySelectorAll(".rounded-full");
    expect(progressSegments.length).toBe(3);
  });

  it("renders github logo icon", () => {
    render(<ReleaseSetupWizard {...baseProps} />);
    expect(screen.getByTestId("github-logo")).toBeInTheDocument();
  });

  it("shows default workflow as ai_powered", () => {
    render(<ReleaseSetupWizard {...baseProps} />);
    expect(screen.getByText("ai_powered")).toBeInTheDocument();
  });

  it("updates workflow via WorkflowStep onChange", () => {
    render(<ReleaseSetupWizard {...baseProps} />);
    fireEvent.click(screen.getByText("Change to automated"));
    expect(screen.getByText("automated")).toBeInTheDocument();
  });

  it("shows step 2 of 3 description on configure step", () => {
    render(<ReleaseSetupWizard {...baseProps} />);
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText(/Step 2 of 3/)).toBeInTheDocument();
  });

  it("shows step 3 of 3 description on setup method step", () => {
    render(<ReleaseSetupWizard {...baseProps} />);
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText(/Step 3 of 3/)).toBeInTheDocument();
  });

  it("calls handleComplete on Complete Setup click", () => {
    const mockMutation = vi.fn().mockResolvedValue(undefined);
    mockUseMutation.mockReturnValue(mockMutation);
    render(<ReleaseSetupWizard {...baseProps} />);
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Complete Setup"));
    expect(mockMutation).toHaveBeenCalled();
  });

  it("navigates back from step 3 to step 2", () => {
    render(<ReleaseSetupWizard {...baseProps} />);
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByTestId("setup-method-step")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Back"));
    expect(screen.getByTestId("configure-step")).toBeInTheDocument();
  });

  it("renders sheet header", () => {
    render(<ReleaseSetupWizard {...baseProps} />);
    expect(screen.getByTestId("sheet-header")).toBeInTheDocument();
  });

  it("Back button is enabled on step 2", () => {
    render(<ReleaseSetupWizard {...baseProps} />);
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Back").closest("button")).not.toBeDisabled();
  });
});
