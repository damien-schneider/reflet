import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockListRepositories = vi.fn().mockResolvedValue([]);
const mockListLabels = vi.fn().mockResolvedValue([]);
const mockSyncReleases = vi.fn().mockResolvedValue(undefined);
const mockSyncIssues = vi.fn().mockResolvedValue(undefined);
const mockSetupWebhook = vi.fn().mockResolvedValue(undefined);

vi.mock("convex/react", () => ({
  useAction: vi.fn((ref) => {
    const name = String(ref);
    if (name.includes("listRepositories")) {
      return mockListRepositories;
    }
    if (name.includes("listLabels")) {
      return mockListLabels;
    }
    if (name.includes("syncReleases")) {
      return mockSyncReleases;
    }
    if (name.includes("syncIssues")) {
      return mockSyncIssues;
    }
    if (name.includes("setupWebhook")) {
      return mockSetupWebhook;
    }
    return vi.fn();
  }),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    integrations: {
      github: {
        client_actions: {
          listLabels: "integrations.github.client_actions.listLabels",
          listRepositories:
            "integrations.github.client_actions.listRepositories",
          setupWebhook: "integrations.github.client_actions.setupWebhook",
          syncIssues: "integrations.github.client_actions.syncIssues",
          syncReleases: "integrations.github.client_actions.syncReleases",
        },
      },
    },
  },
}));

vi.mock("@/lib/analytics", () => ({
  capture: vi.fn(),
}));

import { useGitHubSettings } from "./use-github-settings";

beforeEach(() => {
  mockListRepositories.mockResolvedValue([]);
  mockListLabels.mockResolvedValue([]);
  mockSyncReleases.mockResolvedValue(undefined);
  mockSyncIssues.mockResolvedValue(undefined);
  mockSetupWebhook.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const defaultProps = {
  deleteLabelMapping: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  hasRepository: true,
  hasWebhook: false,
  isConnected: true,
  orgId: "org1" as never,
  orgSlug: "my-org",
  selectRepository: vi.fn().mockResolvedValue(undefined),
  toggleAutoSync: vi.fn().mockResolvedValue(undefined),
  toggleIssuesSync: vi.fn().mockResolvedValue(undefined),
  upsertLabelMapping: vi.fn().mockResolvedValue(undefined),
  userId: "user_123",
};

describe("useGitHubSettings", () => {
  it("returns initial state", () => {
    const { result } = renderHook(() => useGitHubSettings(defaultProps));
    expect(result.current.repositories).toEqual([]);
    expect(result.current.loadingRepos).toBe(false);
    expect(result.current.selectedRepo).toBe("");
    expect(result.current.isSyncing).toBe(false);
    expect(result.current.isSettingUp).toBe(false);
    expect(result.current.isDisconnecting).toBe(false);
    expect(result.current.isSyncingIssues).toBe(false);
    expect(result.current.githubLabels).toEqual([]);
    expect(result.current.isLoadingLabels).toBe(false);
    expect(result.current.webhookSetupError).toBeNull();
  });

  it("fetchRepositories calls listRepositories action", async () => {
    mockListRepositories.mockResolvedValueOnce([
      {
        defaultBranch: "main",
        description: null,
        fullName: "org/repo",
        id: "r1",
        isPrivate: false,
        name: "repo",
      },
    ]);

    const { result } = renderHook(() => useGitHubSettings(defaultProps));

    await act(async () => {
      await result.current.fetchRepositories();
    });

    expect(mockListRepositories).toHaveBeenCalledWith({
      organizationId: "org1",
    });
    expect(result.current.repositories).toHaveLength(1);
  });

  it("connectHref contains install URL with user and org params", () => {
    const { result } = renderHook(() => useGitHubSettings(defaultProps));

    expect(result.current.connectHref).toContain("/api/github/install");
    expect(result.current.connectHref).toContain("userId=user_123");
    expect(result.current.connectHref).toContain("organizationId=org1");
  });

  it("handleDisconnect calls disconnect mutation", async () => {
    const disconnect = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useGitHubSettings({ ...defaultProps, disconnect })
    );

    await act(async () => {
      await result.current.handleDisconnect();
    });

    expect(disconnect).toHaveBeenCalledWith({
      organizationId: "org1",
    });
  });

  it("handleSyncReleases calls syncReleases action", async () => {
    const { result } = renderHook(() => useGitHubSettings(defaultProps));

    await act(async () => {
      await result.current.handleSyncReleases();
    });

    expect(mockSyncReleases).toHaveBeenCalledWith({
      organizationId: "org1",
    });
  });

  it("handleSetup calls setupWebhook action", async () => {
    const { result } = renderHook(() => useGitHubSettings(defaultProps));

    await act(async () => {
      await result.current.handleSetup();
    });

    expect(mockSetupWebhook).toHaveBeenCalledWith({
      organizationId: "org1",
    });
  });

  it("handleSetup sets error on failure", async () => {
    mockSetupWebhook.mockRejectedValueOnce(new Error("Details"));

    const { result } = renderHook(() => useGitHubSettings(defaultProps));

    await act(async () => {
      await result.current.handleSetup();
    });

    expect(result.current.webhookSetupError).toEqual({
      code: "SETUP_FAILED",
      message: "Details",
    });
  });

  it("clearWebhookSetupError clears the error", async () => {
    mockSetupWebhook.mockRejectedValueOnce(new Error("err"));

    const { result } = renderHook(() => useGitHubSettings(defaultProps));

    await act(async () => {
      await result.current.handleSetup();
    });
    expect(result.current.webhookSetupError).not.toBeNull();

    act(() => {
      result.current.clearWebhookSetupError();
    });
    expect(result.current.webhookSetupError).toBeNull();
  });

  it("handleToggleAutoSync calls toggleAutoSync", async () => {
    const toggleAutoSync = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useGitHubSettings({
        ...defaultProps,
        hasWebhook: true,
        toggleAutoSync,
      })
    );

    await act(async () => {
      await result.current.handleToggleAutoSync(true);
    });

    expect(toggleAutoSync).toHaveBeenCalledWith({
      enabled: true,
      organizationId: "org1",
    });
  });

  it("handleToggleIssuesSync calls toggleIssuesSync", async () => {
    const toggleIssuesSync = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useGitHubSettings({ ...defaultProps, toggleIssuesSync })
    );

    await act(async () => {
      await result.current.handleToggleIssuesSync(true, false);
    });

    expect(toggleIssuesSync).toHaveBeenCalledWith({
      autoSync: false,
      enabled: true,
      organizationId: "org1",
    });
  });

  it("handleAddLabelMapping calls upsertLabelMapping", async () => {
    const upsertLabelMapping = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useGitHubSettings({ ...defaultProps, upsertLabelMapping })
    );

    await act(async () => {
      await result.current.handleAddLabelMapping({
        autoSync: true,
        githubLabelName: "bug",
      });
    });

    expect(upsertLabelMapping).toHaveBeenCalledWith({
      autoSync: true,
      githubLabelName: "bug",
      organizationId: "org1",
      targetTagId: undefined,
    });
  });

  it("handleDeleteLabelMapping calls deleteLabelMapping", async () => {
    const deleteLabelMapping = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useGitHubSettings({ ...defaultProps, deleteLabelMapping })
    );

    await act(async () => {
      await result.current.handleDeleteLabelMapping("mapping1" as never);
    });

    expect(deleteLabelMapping).toHaveBeenCalledWith({
      mappingId: "mapping1",
    });
  });

  it("does nothing when orgId is undefined", async () => {
    mockListRepositories.mockClear();
    mockSyncReleases.mockClear();
    mockSetupWebhook.mockClear();
    const { result } = renderHook(() =>
      useGitHubSettings({ ...defaultProps, orgId: undefined })
    );

    await act(async () => {
      await result.current.fetchRepositories();
      await result.current.handleSyncReleases();
      await result.current.handleSetup();
      await result.current.handleDisconnect();
    });

    expect(mockListRepositories).not.toHaveBeenCalled();
    expect(mockSyncReleases).not.toHaveBeenCalled();
    expect(mockSetupWebhook).not.toHaveBeenCalled();
  });

  it("handleSyncIssues calls syncIssues action", async () => {
    const { result } = renderHook(() => useGitHubSettings(defaultProps));

    await act(async () => {
      await result.current.handleSyncIssues();
    });

    expect(mockSyncIssues).toHaveBeenCalledWith({
      organizationId: "org1",
      state: "all",
    });
  });

  it("fetchLabels calls listLabels action", async () => {
    mockListLabels.mockResolvedValueOnce([
      { color: "ff0000", description: null, id: "l1", name: "bug" },
    ]);

    const { result } = renderHook(() => useGitHubSettings(defaultProps));

    await act(async () => {
      await result.current.fetchLabels();
    });

    expect(mockListLabels).toHaveBeenCalledWith({
      organizationId: "org1",
    });
    expect(result.current.githubLabels).toHaveLength(1);
  });

  it("handleToggleAutoSync sets up webhook when not present", async () => {
    const toggleAutoSync = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useGitHubSettings({
        ...defaultProps,
        hasWebhook: false,
        toggleAutoSync,
      })
    );

    await act(async () => {
      await result.current.handleToggleAutoSync(true);
    });

    // Should call setup first since there's no webhook
    expect(mockSetupWebhook).toHaveBeenCalledWith({
      organizationId: "org1",
    });
  });

  it("handleSelectRepository calls the function without error", async () => {
    mockListRepositories.mockResolvedValueOnce([
      {
        defaultBranch: "main",
        description: null,
        fullName: "owner/repo",
        id: "r1",
        isPrivate: false,
        name: "repo",
      },
    ]);

    const { result } = renderHook(() => useGitHubSettings(defaultProps));

    await act(async () => {
      await result.current.fetchRepositories();
    });

    // Select the repo
    act(() => {
      result.current.setSelectedRepo("r1");
    });

    await act(async () => {
      await result.current.handleSelectRepository();
    });

    expect(defaultProps.selectRepository).toHaveBeenCalledWith({
      defaultBranch: "main",
      organizationId: "org1",
      repositoryFullName: "owner/repo",
      repositoryId: "r1",
    });
  });

  it("handleChangeRepository triggers repo fetch", async () => {
    const { result } = renderHook(() => useGitHubSettings(defaultProps));

    await act(async () => {
      await result.current.handleChangeRepository();
    });

    // After handleChangeRepository, fetchRepositories should be called
    expect(mockListRepositories).toHaveBeenCalled();
  });

  it("fetchLabels with empty response sets empty array", async () => {
    mockListLabels.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useGitHubSettings(defaultProps));

    await act(async () => {
      await result.current.fetchLabels();
    });

    expect(result.current.githubLabels).toEqual([]);
  });

  it("returns initial loadingRepos as false", () => {
    const { result } = renderHook(() => useGitHubSettings(defaultProps));
    expect(result.current.loadingRepos).toBe(false);
  });

  it("returns initial webhook error as null", () => {
    const { result } = renderHook(() => useGitHubSettings(defaultProps));
    expect(result.current.webhookSetupError).toBeNull();
  });

  it("returns empty repositories initially", () => {
    const { result } = renderHook(() => useGitHubSettings(defaultProps));
    expect(result.current.repositories).toEqual([]);
  });
});
