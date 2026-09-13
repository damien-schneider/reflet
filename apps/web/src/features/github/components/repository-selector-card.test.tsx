import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { RepositorySelectorSection } from "./repository-selector-card";

const repositories = [
  {
    defaultBranch: "main",
    description: null,
    fullName: "acme/control-ui",
    id: "repo-control",
    isPrivate: true,
    name: "control-ui",
  },
  {
    defaultBranch: "main",
    description: null,
    fullName: "team/reflet",
    id: "repo-reflet",
    isPrivate: false,
    name: "reflet",
  },
];

function renderSelector(
  overrides: Partial<ComponentProps<typeof RepositorySelectorSection>> = {}
) {
  const props = {
    hasRepository: false,
    isAdmin: true,
    loadingRepos: false,
    onChangeRepository: vi.fn(),
    onConnectRepository: vi.fn(),
    onSelectRepo: vi.fn<(repositoryId: string) => void>(),
    repositories,
    selectedRepo: "",
    ...overrides,
  };
  render(<RepositorySelectorSection {...props} />);
  return props;
}

describe("repository selection", () => {
  it.each(["ACME", "control-ui", "Control Ui", "acme/control-ui"])(
    "searches by %s and returns the selected repository ID",
    async (query) => {
      const user = userEvent.setup();
      const { onSelectRepo } = renderSelector();
      await user.type(screen.getByRole("combobox"), query);
      await user.click(
        await screen.findByRole("option", { name: /acme\/control-ui/ })
      );
      expect(onSelectRepo).toHaveBeenCalledExactlyOnceWith("repo-control");
    }
  );

  it("recovers from a search with no results", async () => {
    const user = userEvent.setup();
    renderSelector();
    const input = screen.getByRole("combobox");
    await user.type(input, "missing-repository");
    expect(await screen.findByText("No repositories found")).toBeVisible();
    await user.clear(input);
    await user.type(input, "team");
    expect(
      await screen.findByRole("option", { name: /team\/reflet/ })
    ).toBeVisible();
    expect(screen.queryByText("No repositories found")).not.toBeInTheDocument();
  });

  it("waits for repositories before offering selection", () => {
    renderSelector({ loadingRepos: true });
    expect(screen.getByText("Loading repositories...")).toBeVisible();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("shows an empty result when the account has no repositories", async () => {
    const user = userEvent.setup();
    renderSelector({ repositories: [] });
    await user.click(screen.getByRole("combobox"));
    expect(await screen.findByText("No repositories found")).toBeVisible();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("requires a selection before connecting", async () => {
    const user = userEvent.setup();
    const { onConnectRepository } = renderSelector();
    const connect = screen.getByRole("button", { name: "Connect Repository" });
    expect(connect).toBeDisabled();
    await user.click(connect);
    expect(onConnectRepository).not.toHaveBeenCalled();
  });

  it("connects the selected repository and keeps a failed connection retryable", async () => {
    const user = userEvent.setup();
    const { onConnectRepository } = renderSelector({
      error: "Connection failed. Try again.",
      selectedRepo: "repo-control",
    });
    expect(screen.getByText("Connection failed. Try again.")).toBeVisible();
    expect(screen.getByRole("combobox")).toHaveValue("Control Ui");
    await user.click(
      screen.getByRole("button", { name: "Connect Repository" })
    );
    expect(onConnectRepository).toHaveBeenCalledOnce();
  });

  it("lets an admin change the connected repository", async () => {
    const user = userEvent.setup();
    const { onChangeRepository } = renderSelector({
      hasRepository: true,
      repositoryFullName: "acme/control-ui",
    });
    expect(screen.getByText("acme/control-ui")).toBeVisible();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Change" }));
    expect(onChangeRepository).toHaveBeenCalledOnce();
  });

  it.each([false, true])(
    "hides connection actions for a non-admin when hasRepository is %s",
    (hasRepository) => {
      renderSelector({
        hasRepository,
        isAdmin: false,
        repositoryFullName: "acme/control-ui",
      });
      expect(
        screen.queryByRole("button", { name: "Connect Repository" })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Change" })
      ).not.toBeInTheDocument();
    }
  );
});
