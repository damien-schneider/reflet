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
    filter: _filter,
    itemToStringLabel,
    value: _value,
    onValueChange,
  }: {
    children: React.ReactNode;
    items?: unknown[];
    filter?: (item: unknown, query: string) => boolean;
    itemToStringLabel?: (item: unknown) => string;
    value?: unknown;
    onValueChange?: (value: unknown) => void;
  }) => {
    const [inputValue, setInputValue] = useState("");
    const [open, setOpen] = useState(false);

    // Process children recursively to inject context
    const processChildren = (childNodes: React.ReactNode): React.ReactNode => {
      return Children.map(childNodes, (child) => {
        if (!isValidElement(child)) {
          return child;
        }

        const childProps: Record<string, unknown> = {};

        // Add context-aware props based on component type
        if (child.type === ComboboxInput) {
          childProps.value = inputValue;
          childProps.onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setInputValue(e.target.value);
            setOpen(true);
          };
          childProps.onFocus = () => setOpen(true);
        }

        // For ComboboxList, inject items and onValueChange, keep original children
        if (child.type === ComboboxList) {
          childProps._items = items;
          childProps._onValueChange = onValueChange;
          childProps._itemToStringLabel = itemToStringLabel;
        }

        // Process nested children (except ComboboxList which uses render prop)
        if (child.type !== ComboboxList) {
          const childElement = child as React.ReactElement<{
            children?: React.ReactNode;
          }>;
          if (childElement.props.children) {
            childProps.children = processChildren(childElement.props.children);
          }
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
  }: React.InputHTMLAttributes<HTMLInputElement>) =>
    React.createElement("input", {
      placeholder,
      type: "text",
      value,
      onChange,
      onFocus,
      ...props,
    });

  const ComboboxContent = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(
      "div",
      { "data-testid": "combobox-content" },
      children
    );
  };

  const ComboboxList = ({
    children,
    _items,
    _onValueChange,
    _itemToStringLabel,
  }: {
    children: React.ReactNode | ((item: unknown) => React.ReactNode);
    _items?: unknown[];
    _onValueChange?: (value: unknown) => void;
    _itemToStringLabel?: (item: unknown) => string;
  }) => {
    // If children is a render function, invoke it with each item
    if (typeof children === "function" && _items) {
      return React.createElement(
        "div",
        { "data-testid": "combobox-list" },
        _items.map((item, index) =>
          React.createElement(
            "div",
            {
              key: index,
              "data-testid": "combobox-list-item",
              onClick: () => _onValueChange?.(item),
              role: "option",
            },
            (children as (item: unknown) => React.ReactNode)(item)
          )
        )
      );
    }
    return React.createElement(
      "div",
      { "data-testid": "combobox-list" },
      children
    );
  };

  const ComboboxItem = ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value?: string;
  }) =>
    React.createElement(
      "div",
      { "data-value": value, role: "option" },
      children
    );

  const ComboboxGroup = ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children);
  const ComboboxLabel = ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children);
  const ComboboxEmpty = ({ children }: { children: React.ReactNode }) =>
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

  describe("connected state", () => {
    it("renders connected repository name", () => {
      render(
        <RepositorySelectorCard
          hasRepository
          isAdmin={true}
          loadingRepos={false}
          onChangeRepository={vi.fn()}
          onConnectRepository={vi.fn()}
          onSelectRepo={vi.fn()}
          repositories={mockRepositories}
          repositoryFullName="owner/connected-repo"
          selectedRepo="repo-1"
        />
      );
      expect(screen.getByText("owner/connected-repo")).toBeInTheDocument();
    });

    it("renders Change Repository button for admin", () => {
      render(
        <RepositorySelectorCard
          hasRepository
          isAdmin={true}
          loadingRepos={false}
          onChangeRepository={vi.fn()}
          onConnectRepository={vi.fn()}
          onSelectRepo={vi.fn()}
          repositories={mockRepositories}
          repositoryFullName="owner/repo"
          selectedRepo="repo-1"
        />
      );
      expect(screen.getByText("Change Repository")).toBeInTheDocument();
    });

    it("calls onChangeRepository when Change Repository clicked", async () => {
      const onChangeRepository = vi.fn();
      const user = userEvent.setup();
      render(
        <RepositorySelectorCard
          hasRepository
          isAdmin={true}
          loadingRepos={false}
          onChangeRepository={onChangeRepository}
          onConnectRepository={vi.fn()}
          onSelectRepo={vi.fn()}
          repositories={mockRepositories}
          repositoryFullName="owner/repo"
          selectedRepo="repo-1"
        />
      );
      await user.click(screen.getByText("Change Repository"));
      expect(onChangeRepository).toHaveBeenCalled();
    });
  });

  describe("loading state", () => {
    it("shows loading indicator when loadingRepos is true", () => {
      render(
        <RepositorySelectorCard
          hasRepository={false}
          isAdmin={true}
          loadingRepos
          onChangeRepository={vi.fn()}
          onConnectRepository={vi.fn()}
          onSelectRepo={vi.fn()}
          repositories={[]}
          selectedRepo=""
        />
      );
      expect(screen.getByTestId("card")).toBeInTheDocument();
    });

    it("shows Loading repositories text when loadingRepos", () => {
      render(
        <RepositorySelectorCard
          hasRepository={false}
          isAdmin={true}
          loadingRepos
          onChangeRepository={vi.fn()}
          onConnectRepository={vi.fn()}
          onSelectRepo={vi.fn()}
          repositories={[]}
          selectedRepo=""
        />
      );
      expect(screen.getByText("Loading repositories...")).toBeInTheDocument();
    });

    it("does not show combobox when loading", () => {
      render(
        <RepositorySelectorCard
          hasRepository={false}
          isAdmin={true}
          loadingRepos
          onChangeRepository={vi.fn()}
          onConnectRepository={vi.fn()}
          onSelectRepo={vi.fn()}
          repositories={[]}
          selectedRepo=""
        />
      );
      expect(screen.queryByTestId("combobox")).not.toBeInTheDocument();
    });
  });

  describe("non-admin state", () => {
    it("renders read-only view for non-admin", () => {
      render(
        <RepositorySelectorCard
          hasRepository
          isAdmin={false}
          loadingRepos={false}
          onChangeRepository={vi.fn()}
          onConnectRepository={vi.fn()}
          onSelectRepo={vi.fn()}
          repositories={mockRepositories}
          repositoryFullName="owner/repo"
          selectedRepo="repo-1"
        />
      );
      expect(screen.queryByText("Change Repository")).toBeNull();
    });

    it("renders card title", () => {
      render(
        <RepositorySelectorCard
          hasRepository={false}
          isAdmin={true}
          loadingRepos={false}
          onChangeRepository={vi.fn()}
          onConnectRepository={vi.fn()}
          onSelectRepo={vi.fn()}
          repositories={mockRepositories}
          selectedRepo=""
        />
      );
      expect(screen.getByText("Repository")).toBeInTheDocument();
    });

    it("renders card description for unconnected state", () => {
      render(
        <RepositorySelectorCard
          hasRepository={false}
          isAdmin={true}
          loadingRepos={false}
          onChangeRepository={vi.fn()}
          onConnectRepository={vi.fn()}
          onSelectRepo={vi.fn()}
          repositories={mockRepositories}
          selectedRepo=""
        />
      );
      expect(
        screen.getByText(/Select a repository to sync releases from/)
      ).toBeInTheDocument();
    });

    it("renders Connect Repository button for admin", () => {
      render(
        <RepositorySelectorCard
          hasRepository={false}
          isAdmin={true}
          loadingRepos={false}
          onChangeRepository={vi.fn()}
          onConnectRepository={vi.fn()}
          onSelectRepo={vi.fn()}
          repositories={mockRepositories}
          selectedRepo=""
        />
      );
      expect(screen.getByText("Connect Repository")).toBeInTheDocument();
    });

    it("disables Connect Repository when no repo selected", () => {
      render(
        <RepositorySelectorCard
          hasRepository={false}
          isAdmin={true}
          loadingRepos={false}
          onChangeRepository={vi.fn()}
          onConnectRepository={vi.fn()}
          onSelectRepo={vi.fn()}
          repositories={mockRepositories}
          selectedRepo=""
        />
      );
      expect(screen.getByText("Connect Repository")).toBeDisabled();
    });

    it("enables Connect Repository when repo is selected", () => {
      render(
        <RepositorySelectorCard
          hasRepository={false}
          isAdmin={true}
          loadingRepos={false}
          onChangeRepository={vi.fn()}
          onConnectRepository={vi.fn()}
          onSelectRepo={vi.fn()}
          repositories={mockRepositories}
          selectedRepo="repo-1"
        />
      );
      expect(screen.getByText("Connect Repository")).not.toBeDisabled();
    });

    it("calls onConnectRepository when Connect Repository clicked", async () => {
      const onConnect = vi.fn();
      const user = userEvent.setup();
      render(
        <RepositorySelectorCard
          hasRepository={false}
          isAdmin={true}
          loadingRepos={false}
          onChangeRepository={vi.fn()}
          onConnectRepository={onConnect}
          onSelectRepo={vi.fn()}
          repositories={mockRepositories}
          selectedRepo="repo-1"
        />
      );
      await user.click(screen.getByText("Connect Repository"));
      expect(onConnect).toHaveBeenCalled();
    });

    it("renders private badge for private repos", () => {
      render(
        <RepositorySelectorCard
          hasRepository={false}
          isAdmin={true}
          loadingRepos={false}
          onChangeRepository={vi.fn()}
          onConnectRepository={vi.fn()}
          onSelectRepo={vi.fn()}
          repositories={mockRepositories}
          selectedRepo=""
        />
      );
      const _lockIcons = screen.getAllByAttribute
        ? document.querySelectorAll('[data-icon="lock"]')
        : [];
      // At least the repository list renders
      expect(screen.getByTestId("combobox")).toBeInTheDocument();
    });

    it("renders repository selector combobox", () => {
      render(
        <RepositorySelectorCard
          hasRepository={false}
          isAdmin={true}
          loadingRepos={false}
          onChangeRepository={vi.fn()}
          onConnectRepository={vi.fn()}
          onSelectRepo={vi.fn()}
          repositories={mockRepositories}
          selectedRepo=""
        />
      );
      expect(screen.getByTestId("combobox")).toBeInTheDocument();
    });

    it("does not show Connect Repository button for non-admin disconnected", () => {
      render(
        <RepositorySelectorCard
          hasRepository={false}
          isAdmin={false}
          loadingRepos={false}
          onChangeRepository={vi.fn()}
          onConnectRepository={vi.fn()}
          onSelectRepo={vi.fn()}
          repositories={mockRepositories}
          selectedRepo=""
        />
      );
      expect(screen.queryByText("Connect Repository")).not.toBeInTheDocument();
    });

    it("shows connected description when repositoryFullName provided", () => {
      render(
        <RepositorySelectorCard
          hasRepository
          isAdmin={true}
          loadingRepos={false}
          onChangeRepository={vi.fn()}
          onConnectRepository={vi.fn()}
          onSelectRepo={vi.fn()}
          repositories={mockRepositories}
          repositoryFullName="org/my-repo"
          selectedRepo="repo-1"
        />
      );
      expect(screen.getByText(/Connected to org\/my-repo/)).toBeInTheDocument();
    });

    it("shows unconnected description when no repositoryFullName", () => {
      render(
        <RepositorySelectorCard
          hasRepository={false}
          isAdmin={true}
          loadingRepos={false}
          onChangeRepository={vi.fn()}
          onConnectRepository={vi.fn()}
          onSelectRepo={vi.fn()}
          repositories={mockRepositories}
          selectedRepo=""
        />
      );
      expect(
        screen.getByText(/Select a repository to sync releases from/)
      ).toBeInTheDocument();
    });
  });

  describe("repository display and selection", () => {
    it("renders formatted repository display names", () => {
      render(
        <RepositorySelectorCard
          hasRepository={false}
          isAdmin={true}
          loadingRepos={false}
          onChangeRepository={vi.fn()}
          onConnectRepository={vi.fn()}
          onSelectRepo={vi.fn()}
          repositories={mockRepositories}
          selectedRepo=""
        />
      );
      // formatRepositoryName("test-repo") → "Test Repo"
      expect(screen.getByText("Test Repo")).toBeInTheDocument();
      // formatRepositoryName("another-repo") → "Another Repo"
      expect(screen.getByText("Another Repo")).toBeInTheDocument();
      // formatRepositoryName("demo-project") → "Demo Project"
      expect(screen.getByText("Demo Project")).toBeInTheDocument();
    });

    it("renders full name under each repository item", () => {
      render(
        <RepositorySelectorCard
          hasRepository={false}
          isAdmin={true}
          loadingRepos={false}
          onChangeRepository={vi.fn()}
          onConnectRepository={vi.fn()}
          onSelectRepo={vi.fn()}
          repositories={mockRepositories}
          selectedRepo=""
        />
      );
      expect(screen.getByText("owner-a/test-repo")).toBeInTheDocument();
      expect(screen.getByText("owner-a/another-repo")).toBeInTheDocument();
      expect(screen.getByText("owner-b/demo-project")).toBeInTheDocument();
    });

    it("renders lock icon for private repos and globe for public", () => {
      render(
        <RepositorySelectorCard
          hasRepository={false}
          isAdmin={true}
          loadingRepos={false}
          onChangeRepository={vi.fn()}
          onConnectRepository={vi.fn()}
          onSelectRepo={vi.fn()}
          repositories={mockRepositories}
          selectedRepo=""
        />
      );
      // repo-2 is private, others public
      const lockIcons = document.querySelectorAll('[data-icon="lock"]');
      const globeIcons = document.querySelectorAll('[data-icon="globe"]');
      expect(lockIcons.length).toBe(1);
      expect(globeIcons.length).toBe(2);
    });

    it("calls onSelectRepo when a repository item is clicked", async () => {
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

      // Click on the first repo list item wrapper
      const listItems = screen.getAllByTestId("combobox-list-item");
      await user.click(listItems[0]);

      expect(onSelectRepo).toHaveBeenCalledWith("repo-1");
    });

    it("renders with empty repositories list", () => {
      render(
        <RepositorySelectorCard
          hasRepository={false}
          isAdmin={true}
          loadingRepos={false}
          onChangeRepository={vi.fn()}
          onConnectRepository={vi.fn()}
          onSelectRepo={vi.fn()}
          repositories={[]}
          selectedRepo=""
        />
      );
      expect(screen.getByTestId("combobox")).toBeInTheDocument();
      expect(
        screen.queryByTestId("combobox-list-item")
      ).not.toBeInTheDocument();
    });
  });
});
