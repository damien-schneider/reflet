import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockCreateKeyword = vi.fn();
const mockRemoveKeyword = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => {
    const result = mockUseMutation(...args);
    return result;
  },
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    intelligence: {
      keywords: {
        list: "intelligence.keywords.list",
        create: "intelligence.keywords.create",
        remove: "intelligence.keywords.remove",
      },
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    color,
  }: {
    children: React.ReactNode;
    color?: string;
  }) => <span data-color={color}>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button
      aria-label={props["aria-label"] as string | undefined}
      disabled={disabled}
      onClick={onClick}
      type={(props.type as "button" | "submit" | "reset") ?? "button"}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    ...props
  }: {
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    [key: string]: unknown;
  }) => (
    <input
      onChange={onChange}
      placeholder={placeholder}
      value={value}
      {...props}
    />
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
    value,
  }: {
    children: React.ReactNode;
    onValueChange?: (value: string) => void;
    value?: string;
  }) => (
    <div data-testid="select" data-value={value}>
      {children}
      <select
        data-testid="select-native"
        onChange={(e) => onValueChange?.(e.target.value)}
        value={value}
      >
        <option value="reddit">Reddit</option>
        <option value="web">Web</option>
        <option value="both">Both</option>
      </select>
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
  SelectTrigger: ({
    children,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <>{children}</>,
  SelectValue: () => null,
}));

vi.mock("@phosphor-icons/react", () => ({
  Hash: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="icon-hash" />
  ),
  Plus: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="icon-plus" />
  ),
  X: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="icon-x" />
  ),
}));

import { KeywordManager } from "./keyword-manager";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const testOrgId = "org-1" as never;

const sampleKeywords = [
  { _id: "kw-1", keyword: "product analytics", source: "reddit" },
  { _id: "kw-2", keyword: "user feedback", source: "web" },
  { _id: "kw-3", keyword: "NPS survey", source: "both", subreddit: "r/SaaS" },
];

describe("KeywordManager", () => {
  it("renders keyword list", () => {
    mockUseQuery.mockReturnValue(sampleKeywords);
    mockUseMutation.mockReturnValue(vi.fn());
    render(<KeywordManager organizationId={testOrgId} />);
    expect(screen.getByText("product analytics")).toBeInTheDocument();
    expect(screen.getByText("user feedback")).toBeInTheDocument();
    expect(screen.getByText("NPS survey")).toBeInTheDocument();
  });

  it("renders the Keywords title", () => {
    mockUseQuery.mockReturnValue(sampleKeywords);
    mockUseMutation.mockReturnValue(vi.fn());
    render(<KeywordManager organizationId={testOrgId} />);
    expect(screen.getByText("Keywords")).toBeInTheDocument();
  });

  it("shows loading state when keywords are undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    mockUseMutation.mockReturnValue(vi.fn());
    render(<KeywordManager organizationId={testOrgId} />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows empty state when no keywords exist", () => {
    mockUseQuery.mockReturnValue([]);
    mockUseMutation.mockReturnValue(vi.fn());
    render(<KeywordManager organizationId={testOrgId} />);
    expect(
      screen.getByText(
        "No keywords added yet. Add keywords to monitor discussions."
      )
    ).toBeInTheDocument();
  });

  it("renders source badge for reddit", () => {
    mockUseQuery.mockReturnValue([sampleKeywords[0]]);
    mockUseMutation.mockReturnValue(vi.fn());
    render(<KeywordManager organizationId={testOrgId} />);
    const badges = screen.getAllByText("Reddit");
    const sourceBadge = badges.find((el) => el.tagName === "SPAN");
    expect(sourceBadge).toBeInTheDocument();
    expect(sourceBadge).toHaveAttribute("data-color", "orange");
  });

  it("renders source badge for web", () => {
    mockUseQuery.mockReturnValue([sampleKeywords[1]]);
    mockUseMutation.mockReturnValue(vi.fn());
    render(<KeywordManager organizationId={testOrgId} />);
    const badges = screen.getAllByText("Web");
    const sourceBadge = badges.find((el) => el.tagName === "SPAN");
    expect(sourceBadge).toBeInTheDocument();
    expect(sourceBadge).toHaveAttribute("data-color", "blue");
  });

  it("renders source badge for both", () => {
    mockUseQuery.mockReturnValue([sampleKeywords[2]]);
    mockUseMutation.mockReturnValue(vi.fn());
    render(<KeywordManager organizationId={testOrgId} />);
    const badges = screen.getAllByText("Both");
    const sourceBadge = badges.find((el) => el.tagName === "SPAN");
    expect(sourceBadge).toBeInTheDocument();
    expect(sourceBadge).toHaveAttribute("data-color", "purple");
  });

  it("shows subreddit when present", () => {
    mockUseQuery.mockReturnValue([sampleKeywords[2]]);
    mockUseMutation.mockReturnValue(vi.fn());
    render(<KeywordManager organizationId={testOrgId} />);
    expect(screen.getByText("r/SaaS")).toBeInTheDocument();
  });

  it("renders remove button for each keyword", () => {
    mockUseQuery.mockReturnValue(sampleKeywords);
    mockUseMutation.mockReturnValue(vi.fn());
    render(<KeywordManager organizationId={testOrgId} />);
    expect(
      screen.getByLabelText("Remove keyword product analytics")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Remove keyword user feedback")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Remove keyword NPS survey")
    ).toBeInTheDocument();
  });

  it("calls removeKeyword when remove button is clicked", async () => {
    const user = userEvent.setup();
    mockUseQuery.mockReturnValue(sampleKeywords);
    mockRemoveKeyword.mockResolvedValue(undefined);
    mockUseMutation.mockReturnValue(mockRemoveKeyword);
    render(<KeywordManager organizationId={testOrgId} />);
    await user.click(screen.getByLabelText("Remove keyword product analytics"));
    expect(mockRemoveKeyword).toHaveBeenCalledWith({ id: "kw-1" });
  });

  it("renders the add keyword form with input and submit button", () => {
    mockUseQuery.mockReturnValue([]);
    mockUseMutation.mockReturnValue(vi.fn());
    render(<KeywordManager organizationId={testOrgId} />);
    expect(
      screen.getByPlaceholderText("Enter a keyword...")
    ).toBeInTheDocument();
    expect(screen.getByText("Add")).toBeInTheDocument();
  });

  it("submits the form and calls createKeyword", async () => {
    const user = userEvent.setup();
    mockUseQuery.mockReturnValue([]);
    mockCreateKeyword.mockResolvedValue(undefined);
    mockUseMutation.mockReturnValue(mockCreateKeyword);
    render(<KeywordManager organizationId={testOrgId} />);

    await user.type(
      screen.getByPlaceholderText("Enter a keyword..."),
      "new keyword"
    );
    await user.click(screen.getByText("Add"));

    expect(mockCreateKeyword).toHaveBeenCalledWith(
      expect.objectContaining({
        keyword: "new keyword",
        source: "both",
      })
    );
  });

  it("disables submit button when keyword input is empty", () => {
    mockUseQuery.mockReturnValue([]);
    mockUseMutation.mockReturnValue(vi.fn());
    render(<KeywordManager organizationId={testOrgId} />);
    const addButton = screen.getByText("Add");
    expect(addButton).toBeDisabled();
  });
});
