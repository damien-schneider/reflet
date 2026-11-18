/**
 * @vitest-environment jsdom
 */
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockUseMutation = vi.fn(() => vi.fn());
const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: () => mockUseMutation(),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    integrations: {
      github: {
        mutations: { toggleAutoSync: "github.toggleAutoSync" },
        queries: { getConnection: "github.getConnection" },
      },
    },
    organizations: {
      mutations: { update: "organizations.update" },
    },
  },
}));

vi.mock("@ctrl-ui/react/ui/toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@phosphor-icons/react", () => ({
  ArrowLeft: () => <span data-testid="arrow-left" />,
  ArrowRight: () => <span data-testid="arrow-right" />,
  Check: () => <span data-testid="check-icon" />,
  GithubLogo: () => <span data-testid="github-logo" />,
  X: () => <span data-testid="x-icon" />,
}));

vi.mock("@ctrl-ui/react/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetBody: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetClose: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-close">{children}</div>
  ),
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  SheetFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-header">{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

vi.mock("@ctrl-ui/react/ui/button", () => ({
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

vi.mock("@ctrl-ui/react/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
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
  onOpenChange: vi.fn(),
  open: true,
  organizationId: orgId,
  orgSlug: "test-org",
};

describe("ReleaseSetupWizard", () => {
  afterEach(() => {
    vi.clearAllMocks();
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

  it("navigates to step 3 and shows Complete setup", () => {
    render(<ReleaseSetupWizard {...baseProps} />);
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByTestId("setup-method-step")).toBeInTheDocument();
    expect(screen.getByText("Complete setup")).toBeInTheDocument();
  });

  it("navigates back from step 2 to step 1", () => {
    render(<ReleaseSetupWizard {...baseProps} />);
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByTestId("configure-step")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Back"));
    expect(screen.getByTestId("workflow-step")).toBeInTheDocument();
  });

  it("marks the current step in the progress list", () => {
    const { container } = render(<ReleaseSetupWizard {...baseProps} />);
    fireEvent.click(screen.getByText("Next"));
    const items = container.querySelectorAll("ol li");
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items[0]).not.toHaveAttribute("aria-current");
  });

  it("saves the chosen workflow's sync settings when setup completes", () => {
    const mockMutation = vi.fn().mockResolvedValue(undefined);
    mockUseMutation.mockReturnValue(mockMutation);
    render(<ReleaseSetupWizard {...baseProps} />);
    fireEvent.click(screen.getByText("Change to automated"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Complete setup"));
    expect(mockMutation).toHaveBeenCalledWith({
      changelogSettings: expect.objectContaining({
        autoPublishImported: false,
        pushToGithubOnPublish: false,
        targetBranch: "main",
        versionPrefix: "v",
      }),
      id: orgId,
    });
  });

  it("navigates back from step 3 to step 2", () => {
    render(<ReleaseSetupWizard {...baseProps} />);
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByTestId("setup-method-step")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Back"));
    expect(screen.getByTestId("configure-step")).toBeInTheDocument();
  });

  it("Back button is enabled on step 2", () => {
    render(<ReleaseSetupWizard {...baseProps} />);
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Back").closest("button")).not.toBeDisabled();
  });
});
