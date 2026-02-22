import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    releases: { getNextVersion: "releases:getNextVersion" },
  },
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    variant,
    className,
  }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
  }) => (
    <span className={className} data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
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
      onClick={onClick}
      type="button"
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    disabled,
    readOnly,
    className,
    title,
  }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      className={className}
      data-testid="version-input"
      disabled={disabled}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      title={title}
      value={value}
    />
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import { VersionPicker } from "./version-picker";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const ORG_ID = "org123" as Id<"organizations">;

describe("VersionPicker", () => {
  const defaultProps = {
    organizationId: ORG_ID,
    value: "",
    onChange: vi.fn(),
  };

  it("renders the input field", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(<VersionPicker {...defaultProps} />);
    expect(screen.getByTestId("version-input")).toBeInTheDocument();
  });

  it("shows the placeholder text", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(<VersionPicker {...defaultProps} />);
    expect(screen.getByTestId("version-input")).toHaveAttribute(
      "placeholder",
      "v1.0.0"
    );
  });

  it("displays current version value", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(<VersionPicker {...defaultProps} value="1.2.3" />);
    expect(screen.getByTestId("version-input")).toHaveValue("1.2.3");
  });

  it("renders version suggestion buttons when data is available", () => {
    mockUseQuery.mockReturnValue({
      patch: "1.0.1",
      minor: "1.1.0",
      major: "2.0.0",
      current: "1.0.0",
      autoVersioning: true,
      defaultIncrement: "patch",
    });
    render(<VersionPicker {...defaultProps} value="1.0.1" />);
    expect(screen.getByText(/Patch 1.0.1/)).toBeInTheDocument();
    expect(screen.getByText(/Minor 1.1.0/)).toBeInTheDocument();
    expect(screen.getByText(/Major 2.0.0/)).toBeInTheDocument();
  });

  it("displays the latest version badge", () => {
    mockUseQuery.mockReturnValue({
      patch: "1.0.1",
      minor: "1.1.0",
      major: "2.0.0",
      current: "1.0.0",
      autoVersioning: true,
      defaultIncrement: "patch",
    });
    render(<VersionPicker {...defaultProps} value="1.0.1" />);
    expect(screen.getByText("latest: 1.0.0")).toBeInTheDocument();
  });

  it("does not show latest badge when no current version", () => {
    mockUseQuery.mockReturnValue({
      patch: "0.0.1",
      autoVersioning: true,
      defaultIncrement: "patch",
    });
    render(<VersionPicker {...defaultProps} value="0.0.1" />);
    expect(screen.queryByText(/latest:/)).not.toBeInTheDocument();
  });

  it("calls onChange when a version button is clicked", () => {
    const onChange = vi.fn();
    mockUseQuery.mockReturnValue({
      patch: "1.0.1",
      minor: "1.1.0",
      major: "2.0.0",
      autoVersioning: true,
      defaultIncrement: "patch",
    });
    render(
      <VersionPicker {...defaultProps} onChange={onChange} value="1.1.0" />
    );
    fireEvent.click(screen.getByText(/Patch 1.0.1/));
    expect(onChange).toHaveBeenCalledWith("1.0.1");
  });

  it("calls onChange when minor button is clicked", () => {
    const onChange = vi.fn();
    mockUseQuery.mockReturnValue({
      patch: "1.0.1",
      minor: "1.1.0",
      major: "2.0.0",
      autoVersioning: true,
      defaultIncrement: "patch",
    });
    render(
      <VersionPicker {...defaultProps} onChange={onChange} value="1.0.1" />
    );
    fireEvent.click(screen.getByText(/Minor 1.1.0/));
    expect(onChange).toHaveBeenCalledWith("1.1.0");
  });

  it("calls onChange when major button is clicked", () => {
    const onChange = vi.fn();
    mockUseQuery.mockReturnValue({
      patch: "1.0.1",
      minor: "1.1.0",
      major: "2.0.0",
      autoVersioning: true,
      defaultIncrement: "patch",
    });
    render(
      <VersionPicker {...defaultProps} onChange={onChange} value="1.0.1" />
    );
    fireEvent.click(screen.getByText(/Major 2.0.0/));
    expect(onChange).toHaveBeenCalledWith("2.0.0");
  });

  it("does not show version buttons when disabled", () => {
    mockUseQuery.mockReturnValue({
      patch: "1.0.1",
      minor: "1.1.0",
      major: "2.0.0",
      autoVersioning: true,
    });
    render(<VersionPicker {...defaultProps} disabled value="1.0.1" />);
    expect(screen.queryByText(/Patch/)).not.toBeInTheDocument();
  });

  it("disables the input when disabled prop is true", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(<VersionPicker {...defaultProps} disabled />);
    expect(screen.getByTestId("version-input")).toBeDisabled();
  });

  it("sets input as readOnly when auto-versioning is enabled", () => {
    mockUseQuery.mockReturnValue({
      autoVersioning: true,
      patch: "1.0.1",
    });
    render(<VersionPicker {...defaultProps} value="1.0.1" />);
    expect(screen.getByTestId("version-input")).toHaveAttribute("readonly");
  });

  it("does not set readOnly when auto-versioning is false", () => {
    mockUseQuery.mockReturnValue({
      autoVersioning: false,
    });
    render(<VersionPicker {...defaultProps} />);
    expect(screen.getByTestId("version-input").hasAttribute("readonly")).toBe(
      false
    );
  });

  it("calls onChange on manual input change", () => {
    const onChange = vi.fn();
    mockUseQuery.mockReturnValue({ autoVersioning: false });
    render(<VersionPicker {...defaultProps} onChange={onChange} />);
    fireEvent.change(screen.getByTestId("version-input"), {
      target: { value: "3.0.0" },
    });
    expect(onChange).toHaveBeenCalledWith("3.0.0");
  });

  it("applies default patch version via useEffect for new releases", () => {
    const onChange = vi.fn();
    mockUseQuery.mockReturnValue({
      patch: "1.0.1",
      minor: "1.1.0",
      major: "2.0.0",
      autoVersioning: true,
      defaultIncrement: "patch",
    });
    render(<VersionPicker {...defaultProps} onChange={onChange} value="" />);
    expect(onChange).toHaveBeenCalledWith("1.0.1");
  });

  it("applies default minor version when defaultIncrement is minor", () => {
    const onChange = vi.fn();
    mockUseQuery.mockReturnValue({
      patch: "1.0.1",
      minor: "1.1.0",
      major: "2.0.0",
      autoVersioning: true,
      defaultIncrement: "minor",
    });
    render(<VersionPicker {...defaultProps} onChange={onChange} value="" />);
    expect(onChange).toHaveBeenCalledWith("1.1.0");
  });

  it("does not auto-apply when value already set", () => {
    const onChange = vi.fn();
    mockUseQuery.mockReturnValue({
      patch: "1.0.1",
      autoVersioning: true,
      defaultIncrement: "patch",
    });
    render(
      <VersionPicker {...defaultProps} onChange={onChange} value="2.0.0" />
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not show buttons when no suggestions", () => {
    mockUseQuery.mockReturnValue({
      autoVersioning: true,
    });
    render(<VersionPicker {...defaultProps} />);
    expect(screen.queryByText(/Patch/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Minor/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Major/)).not.toBeInTheDocument();
  });

  it("applies active variant to selected version button", () => {
    mockUseQuery.mockReturnValue({
      patch: "1.0.1",
      minor: "1.1.0",
      major: "2.0.0",
      autoVersioning: true,
    });
    render(<VersionPicker {...defaultProps} value="1.0.1" />);
    expect(screen.getByText(/Patch 1.0.1/)).toHaveAttribute(
      "data-variant",
      "default"
    );
    expect(screen.getByText(/Minor 1.1.0/)).toHaveAttribute(
      "data-variant",
      "ghost"
    );
  });

  it("passes excludeReleaseId to useQuery", () => {
    const releaseId = "release123" as Id<"releases">;
    mockUseQuery.mockReturnValue(undefined);
    render(<VersionPicker {...defaultProps} excludeReleaseId={releaseId} />);
    expect(mockUseQuery).toHaveBeenCalledWith("releases:getNextVersion", {
      organizationId: ORG_ID,
      excludeReleaseId: releaseId,
    });
  });

  it("applies custom className", () => {
    mockUseQuery.mockReturnValue(undefined);
    const { container } = render(
      <VersionPicker {...defaultProps} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });
});
