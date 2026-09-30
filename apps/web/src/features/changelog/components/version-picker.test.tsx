import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@ctrl-ui/react/ui/badge", () => ({
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

vi.mock("@ctrl-ui/react/ui/button", () => ({
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

vi.mock("@ctrl-ui/react/ui/input", () => ({
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
import {
  getSuggestedVersion,
  type VersionSuggestions,
} from "./version-suggestions";

afterEach(() => {
  vi.clearAllMocks();
});

const suggest = (
  overrides: Partial<NonNullable<VersionSuggestions>>
): VersionSuggestions => ({
  autoVersioning: true,
  current: null,
  defaultIncrement: "patch",
  major: null,
  minor: null,
  patch: null,
  ...overrides,
});

describe("VersionPicker", () => {
  const defaultProps = {
    onChange: vi.fn(),
    value: "",
    versionSuggestions: undefined,
  };

  it("renders the input field", () => {
    render(<VersionPicker {...defaultProps} />);
    expect(screen.getByTestId("version-input")).toBeInTheDocument();
  });

  it("shows the placeholder text", () => {
    render(<VersionPicker {...defaultProps} />);
    expect(screen.getByTestId("version-input")).toHaveAttribute(
      "placeholder",
      "v1.0.0"
    );
  });

  it("displays current version value", () => {
    render(<VersionPicker {...defaultProps} value="1.2.3" />);
    expect(screen.getByTestId("version-input")).toHaveValue("1.2.3");
  });

  it("renders version suggestion buttons when data is available", () => {
    render(
      <VersionPicker
        {...defaultProps}
        value="1.0.1"
        versionSuggestions={suggest({
          autoVersioning: true,
          current: "1.0.0",
          defaultIncrement: "patch",
          major: "2.0.0",
          minor: "1.1.0",
          patch: "1.0.1",
        })}
      />
    );
    expect(screen.getByText(/Patch 1.0.1/)).toBeInTheDocument();
    expect(screen.getByText(/Minor 1.1.0/)).toBeInTheDocument();
    expect(screen.getByText(/Major 2.0.0/)).toBeInTheDocument();
  });

  it("displays the latest version badge", () => {
    render(
      <VersionPicker
        {...defaultProps}
        value="1.0.1"
        versionSuggestions={suggest({
          autoVersioning: true,
          current: "1.0.0",
          defaultIncrement: "patch",
          major: "2.0.0",
          minor: "1.1.0",
          patch: "1.0.1",
        })}
      />
    );
    expect(screen.getByText("Latest: 1.0.0")).toBeInTheDocument();
  });

  it("does not show latest badge when no current version", () => {
    render(
      <VersionPicker
        {...defaultProps}
        value="0.0.1"
        versionSuggestions={suggest({
          autoVersioning: true,
          defaultIncrement: "patch",
          patch: "0.0.1",
        })}
      />
    );
    expect(screen.queryByText(/Latest:/)).not.toBeInTheDocument();
  });

  it("calls onChange when a version button is clicked", () => {
    const onChange = vi.fn();
    render(
      <VersionPicker
        {...defaultProps}
        onChange={onChange}
        value="1.1.0"
        versionSuggestions={suggest({
          autoVersioning: true,
          defaultIncrement: "patch",
          major: "2.0.0",
          minor: "1.1.0",
          patch: "1.0.1",
        })}
      />
    );
    fireEvent.click(screen.getByText(/Patch 1.0.1/));
    expect(onChange).toHaveBeenCalledWith("1.0.1");
  });

  it("calls onChange when minor button is clicked", () => {
    const onChange = vi.fn();
    render(
      <VersionPicker
        {...defaultProps}
        onChange={onChange}
        value="1.0.1"
        versionSuggestions={suggest({
          autoVersioning: true,
          defaultIncrement: "patch",
          major: "2.0.0",
          minor: "1.1.0",
          patch: "1.0.1",
        })}
      />
    );
    fireEvent.click(screen.getByText(/Minor 1.1.0/));
    expect(onChange).toHaveBeenCalledWith("1.1.0");
  });

  it("calls onChange when major button is clicked", () => {
    const onChange = vi.fn();
    render(
      <VersionPicker
        {...defaultProps}
        onChange={onChange}
        value="1.0.1"
        versionSuggestions={suggest({
          autoVersioning: true,
          defaultIncrement: "patch",
          major: "2.0.0",
          minor: "1.1.0",
          patch: "1.0.1",
        })}
      />
    );
    fireEvent.click(screen.getByText(/Major 2.0.0/));
    expect(onChange).toHaveBeenCalledWith("2.0.0");
  });

  it("does not show version buttons when disabled", () => {
    render(
      <VersionPicker
        {...defaultProps}
        disabled
        value="1.0.1"
        versionSuggestions={suggest({
          autoVersioning: true,
          major: "2.0.0",
          minor: "1.1.0",
          patch: "1.0.1",
        })}
      />
    );
    expect(screen.queryByText(/Patch/)).not.toBeInTheDocument();
  });

  it("disables the input when disabled prop is true", () => {
    render(<VersionPicker {...defaultProps} disabled />);
    expect(screen.getByTestId("version-input")).toBeDisabled();
  });

  it("sets input as readOnly when auto-versioning is enabled", () => {
    render(
      <VersionPicker
        {...defaultProps}
        value="1.0.1"
        versionSuggestions={suggest({
          autoVersioning: true,
          patch: "1.0.1",
        })}
      />
    );
    expect(screen.getByTestId("version-input")).toHaveAttribute("readonly");
  });

  it("does not set readOnly when auto-versioning is false", () => {
    render(
      <VersionPicker
        {...defaultProps}
        versionSuggestions={suggest({
          autoVersioning: false,
        })}
      />
    );
    expect(screen.getByTestId("version-input").hasAttribute("readonly")).toBe(
      false
    );
  });

  it("calls onChange on manual input change", () => {
    const onChange = vi.fn();
    render(
      <VersionPicker
        {...defaultProps}
        onChange={onChange}
        versionSuggestions={suggest({ autoVersioning: false })}
      />
    );
    fireEvent.change(screen.getByTestId("version-input"), {
      target: { value: "3.0.0" },
    });
    expect(onChange).toHaveBeenCalledWith("3.0.0");
  });

  it("suggests the default patch version", () => {
    expect(
      getSuggestedVersion(
        suggest({ major: "2.0.0", minor: "1.1.0", patch: "1.0.1" })
      )
    ).toBe("1.0.1");
  });

  it("suggests the minor version when defaultIncrement is minor", () => {
    expect(
      getSuggestedVersion(
        suggest({
          defaultIncrement: "minor",
          major: "2.0.0",
          minor: "1.1.0",
          patch: "1.0.1",
        })
      )
    ).toBe("1.1.0");
  });

  it("suggests nothing when auto-versioning is off or data is loading", () => {
    expect(
      getSuggestedVersion(suggest({ autoVersioning: false, patch: "1.0.1" }))
    ).toBe("");
    expect(getSuggestedVersion(undefined)).toBe("");
  });

  it("does not show buttons when no suggestions", () => {
    render(
      <VersionPicker
        {...defaultProps}
        versionSuggestions={suggest({
          autoVersioning: true,
        })}
      />
    );
    expect(screen.queryByText(/Patch/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Minor/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Major/)).not.toBeInTheDocument();
  });

  it("applies active variant to selected version button", () => {
    render(
      <VersionPicker
        {...defaultProps}
        value="1.0.1"
        versionSuggestions={suggest({
          autoVersioning: true,
          major: "2.0.0",
          minor: "1.1.0",
          patch: "1.0.1",
        })}
      />
    );
    expect(screen.getByText(/Patch 1.0.1/)).toHaveAttribute(
      "data-variant",
      "solid"
    );
    expect(screen.getByText(/Minor 1.1.0/)).toHaveAttribute(
      "data-variant",
      "ghost"
    );
  });

  it("applies custom className", () => {
    const { container } = render(
      <VersionPicker {...defaultProps} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });
});
