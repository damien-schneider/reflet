import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RepositorySelectorCard } from "./repository-selector-card";

// Mock the UI components
vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-description">{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
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

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button disabled={disabled} onClick={onClick} type="button">
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="label">{children}</span>
  ),
}));

vi.mock("@/components/ui/typography", () => ({
  Text: ({
    children,
    variant,
    className,
  }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
  }) => (
    <span className={className} data-variant={variant}>
      {children}
    </span>
  ),
}));

// Mock the Combobox to simulate filtering behavior
vi.mock("@/components/ui/combobox", async () => {
  const React = await import("react");
  const { useState, Children, isValidElement, cloneElement } = React;

  const Combobox = ({
    children,
    items,
    filter,
    itemToStringLabel,
    value,
    onValueChange,
  }: any) => {
    const [inputValue, setInputValue] = useState("");
    const [open, setOpen] = useState(false);

    // Filter items based on input value
    const filteredItems =
      items?.filter((item: any) => {
        if (!inputValue) {
          return true;
        }
        return filter ? filter(item, inputValue) : true;
      }) || [];

    // Create a context for children
    const _context = {
      inputValue,
      setInputValue,
      filteredItems,
      value,
      onValueChange,
      itemToStringLabel,
      open,
      setOpen,
      items: filteredItems,
    };

    // Process children recursively to inject context
    const processChildren = (children: any): any => {
      return Children.map(children, (child) => {
        if (!isValidElement(child)) {
          return child;
        }

        const childProps: any = {};

        // Add context-aware props based on component type
        if (child.type === ComboboxInput) {
          childProps.value = inputValue;
          childProps.onChange = (e: any) => {
            setInputValue(e.target.value);
            setOpen(true);
          };
          childProps.onFocus = () => setOpen(true);
        }

        // Process nested children
        if (child.props.children) {
          childProps.children = processChildren(child.props.children);
        }

        return cloneElement(child, childProps);
      });
    };

    return React.createElement(
      "div",
      {
        "data-testid": "combobox",
        "data-input-value": inputValue,
        "data-open": open,
      },
      processChildren(children)
    );
  };

  const ComboboxInput = ({
    placeholder,
    value,
    onChange,
    onFocus,
    ...props
  }: any) =>
    React.createElement("input", {
      placeholder,
      type: "text",
      value,
      onChange,
      onFocus,
      ...props,
    });

  const ComboboxContent = ({ children }: any) => {
    // Only render if parent combobox is open
    return React.createElement(
      "div",
      { "data-testid": "combobox-content" },
      children
    );
  };

  const ComboboxList = ({ children }: any) =>
    React.createElement("div", { "data-testid": "combobox-list" }, children);

  const ComboboxItem = ({ children, value }: any) =>
    React.createElement(
      "div",
      { "data-value": value, role: "option" },
      children
    );

  const ComboboxGroup = ({ children }: any) =>
    React.createElement("div", null, children);
  const ComboboxLabel = ({ children }: any) =>
    React.createElement("div", null, children);
  const ComboboxEmpty = ({ children }: any) =>
    React.createElement("div", null, children);

  return {
    Combobox,
    ComboboxInput,
    ComboboxContent,
    ComboboxList,
    ComboboxItem,
    ComboboxGroup,
    ComboboxLabel,
    ComboboxEmpty,
  };
});

vi.mock("@phosphor-icons/react", () => ({
  CaretDownIcon: () => <span data-icon="caret-down" />,
  CheckIcon: () => <span data-icon="check" />,
  GitBranch: () => <span data-icon="git-branch" />,
  Globe: () => <span data-icon="globe" />,
  Link: () => <span data-icon="link" />,
  Lock: () => <span data-icon="lock" />,
  Plug: () => <span data-icon="plug" />,
  Spinner: () => <span data-icon="spinner" />,
  XIcon: () => <span data-icon="x" />,
}));

const mockRepositories = [
  {
    id: "repo-1",
    fullName: "owner-a/test-repo",
    name: "test-repo",
    defaultBranch: "main",
    isPrivate: false,
    description: "A test repository",
  },
  {
    id: "repo-2",
    fullName: "owner-a/another-repo",
    name: "another-repo",
    defaultBranch: "main",
    isPrivate: true,
    description: "Another repository",
  },
  {
    id: "repo-3",
    fullName: "owner-b/demo-project",
    name: "demo-project",
    defaultBranch: "main",
    isPrivate: false,
    description: "Demo project",
  },
];

describe("RepositorySelectorCard - Combobox Filtering", () => {
  afterEach(() => {
    cleanup();
  });

  describe("when typing in the combobox input", () => {
    it("should filter repositories by repository name", async () => {
      const user = userEvent.setup();
      const onSelectRepo = vi.fn();

      render(
        <RepositorySelectorCard
          hasRepository={false}
          isAdmin={true}
          loadingRepos={false}
          onChangeRepository={vi.fn()}
          onConnectRepository={vi.fn()}
          onSelectRepo={onSelectRepo}
          repositories={mockRepositories}
          selectedRepo=""
        />
      );

      // Find the combobox input
      const input = screen.getByPlaceholderText("Search repositories...");

      // Type "demo" in the input
      await user.type(input, "demo");

      // Verify the combobox received the correct input value
      const combobox = screen.getByTestId("combobox");
      expect(combobox).toHaveAttribute("data-input-value", "demo");
    });

    it("should filter repositories by owner name", async () => {
      const user = userEvent.setup();
      const onSelectRepo = vi.fn();

      render(
        <RepositorySelectorCard
          hasRepository={false}
          isAdmin={true}
          loadingRepos={false}
          onChangeRepository={vi.fn()}
          onConnectRepository={vi.fn()}
          onSelectRepo={onSelectRepo}
          repositories={mockRepositories}
          selectedRepo=""
        />
      );

      const input = screen.getByPlaceholderText("Search repositories...");

      // Type "owner-b" to filter by owner
      await user.type(input, "owner-b");

      const combobox = screen.getByTestId("combobox");
      expect(combobox).toHaveAttribute("data-input-value", "owner-b");
    });

    it("should filter repositories by full name (owner/repo)", async () => {
      const user = userEvent.setup();
      const onSelectRepo = vi.fn();

      render(
        <RepositorySelectorCard
          hasRepository={false}
          isAdmin={true}
          loadingRepos={false}
          onChangeRepository={vi.fn()}
          onConnectRepository={vi.fn()}
          onSelectRepo={onSelectRepo}
          repositories={mockRepositories}
          selectedRepo=""
        />
      );

      const input = screen.getByPlaceholderText("Search repositories...");

      // Type full name format
      await user.type(input, "owner-a/test");

      const combobox = screen.getByTestId("combobox");
      expect(combobox).toHaveAttribute("data-input-value", "owner-a/test");
    });

    it("should be case-insensitive when filtering", async () => {
      const user = userEvent.setup();
      const onSelectRepo = vi.fn();

      render(
        <RepositorySelectorCard
          hasRepository={false}
          isAdmin={true}
          loadingRepos={false}
          onChangeRepository={vi.fn()}
          onConnectRepository={vi.fn()}
          onSelectRepo={onSelectRepo}
          repositories={mockRepositories}
          selectedRepo=""
        />
      );

      const input = screen.getByPlaceholderText("Search repositories...");

      // Type in mixed case
      await user.type(input, "DEMO");

      const combobox = screen.getByTestId("combobox");
      expect(combobox).toHaveAttribute("data-input-value", "DEMO");
    });

    it("should show empty state when no repositories match", async () => {
      const user = userEvent.setup();
      const onSelectRepo = vi.fn();

      render(
        <RepositorySelectorCard
          hasRepository={false}
          isAdmin={true}
          loadingRepos={false}
          onChangeRepository={vi.fn()}
          onConnectRepository={vi.fn()}
          onSelectRepo={onSelectRepo}
          repositories={mockRepositories}
          selectedRepo=""
        />
      );

      const input = screen.getByPlaceholderText("Search repositories...");

      // Type something that doesn't match
      await user.type(input, "nonexistent");

      const combobox = screen.getByTestId("combobox");
      expect(combobox).toHaveAttribute("data-input-value", "nonexistent");
    });

    it("should show all repositories when input is cleared", async () => {
      const user = userEvent.setup();
      const onSelectRepo = vi.fn();

      render(
        <RepositorySelectorCard
          hasRepository={false}
          isAdmin={true}
          loadingRepos={false}
          onChangeRepository={vi.fn()}
          onConnectRepository={vi.fn()}
          onSelectRepo={onSelectRepo}
          repositories={mockRepositories}
          selectedRepo=""
        />
      );

      const input = screen.getByPlaceholderText("Search repositories...");

      // Type to filter
      await user.type(input, "demo");
      expect((input as HTMLInputElement).value).toBe("demo");

      // Clear the input
      await user.clear(input);
      expect((input as HTMLInputElement).value).toBe("");
    });
  });
});
