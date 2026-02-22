import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useGitHubSettings } from "./use-github-settings";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({}),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const defaultProps = {
  orgId: "org1" as never,
  orgSlug: "my-org",
  isConnected: true,
  hasRepository: true,
  hasWebhook: false,
  selectRepository: vi.fn().mockResolvedValue(undefined),
  toggleAutoSync: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  toggleIssuesSync: vi.fn().mockResolvedValue(undefined),
  upsertLabelMapping: vi.fn().mockResolvedValue(undefined),
  deleteLabelMapping: vi.fn().mockResolvedValue(undefined),
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

  it("fetchRepositories calls fetch with correct URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          repositories: [
            {
              id: "r1",
              fullName: "org/repo",
              name: "repo",
              defaultBranch: "main",
              isPrivate: false,
              description: null,
            },
          ],
        }),
    });

    const { result } = renderHook(() => useGitHubSettings(defaultProps));

    await act(async () => {
      await result.current.fetchRepositories();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/github/repositories?organizationId=org1"),
      expect.objectContaining({ cache: "no-store" })
    );
    expect(result.current.repositories).toHaveLength(1);
  });

  it("handleConnectGitHub redirects to install URL", () => {
    const mockLocation = { href: "" };
    vi.stubGlobal("window", { location: mockLocation });

    const { result } = renderHook(() => useGitHubSettings(defaultProps));

    act(() => {
      result.current.handleConnectGitHub();
    });

    expect(mockLocation.href).toContain("/api/github/install");
    expect(mockLocation.href).toContain("organizationId=org1");
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

  it("handleSyncReleases calls fetch with POST", async () => {
    const { result } = renderHook(() => useGitHubSettings(defaultProps));

    await act(async () => {
      await result.current.handleSyncReleases();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/github/sync",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("handleSetup calls setup endpoint", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const { result } = renderHook(() => useGitHubSettings(defaultProps));

    await act(async () => {
      await result.current.handleSetup();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/github/setup",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("handleSetup sets error on failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () =>
        Promise.resolve({
          error: "Something went wrong",
          code: "SOME_ERROR",
          message: "Details",
        }),
    });

    const { result } = renderHook(() => useGitHubSettings(defaultProps));

    await act(async () => {
      await result.current.handleSetup();
    });

    expect(result.current.webhookSetupError).toEqual({
      code: "SOME_ERROR",
      message: "Details",
    });
  });

  it("clearWebhookSetupError clears the error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "err", code: "ERR" }),
    });

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
        toggleAutoSync,
        hasWebhook: true,
      })
    );

    await act(async () => {
      await result.current.handleToggleAutoSync(true);
    });

    expect(toggleAutoSync).toHaveBeenCalledWith({
      organizationId: "org1",
      enabled: true,
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
      organizationId: "org1",
      enabled: true,
      autoSync: false,
    });
  });

  it("handleAddLabelMapping calls upsertLabelMapping", async () => {
    const upsertLabelMapping = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useGitHubSettings({ ...defaultProps, upsertLabelMapping })
    );

    await act(async () => {
      await result.current.handleAddLabelMapping({
        githubLabelName: "bug",
        autoSync: true,
      });
    });

    expect(upsertLabelMapping).toHaveBeenCalledWith({
      organizationId: "org1",
      githubLabelName: "bug",
      autoSync: true,
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
    mockFetch.mockClear();
    const { result } = renderHook(() =>
      useGitHubSettings({ ...defaultProps, orgId: undefined })
    );

    mockFetch.mockClear();

    await act(async () => {
      await result.current.fetchRepositories();
      await result.current.handleSyncReleases();
      await result.current.handleSetup();
      await result.current.handleDisconnect();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("handleSyncIssues calls fetch with POST", async () => {
    const { result } = renderHook(() => useGitHubSettings(defaultProps));

    await act(async () => {
      await result.current.handleSyncIssues();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/github/issues",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("fetchLabels calls fetch with correct URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          labels: [
            { id: "l1", name: "bug", color: "ff0000", description: null },
          ],
        }),
    });

    const { result } = renderHook(() => useGitHubSettings(defaultProps));

    await act(async () => {
      await result.current.fetchLabels();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/github/labels?organizationId=org1")
    );
    expect(result.current.githubLabels).toHaveLength(1);
  });

  it("handleToggleAutoSync sets up webhook when not present", async () => {
    const toggleAutoSync = vi.fn().mockResolvedValue(undefined);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const { result } = renderHook(() =>
      useGitHubSettings({
        ...defaultProps,
        toggleAutoSync,
        hasWebhook: false,
      })
    );

    await act(async () => {
      await result.current.handleToggleAutoSync(true);
    });

    // Should call setup first since there's no webhook
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/github/setup",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("handleSelectRepository calls the function without error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          repositories: [
            {
              id: "r1",
              fullName: "owner/repo",
              name: "repo",
              defaultBranch: "main",
              isPrivate: false,
              description: null,
            },
          ],
        }),
    });

    const { result } = renderHook(() => useGitHubSettings(defaultProps));

    await act(async () => {
      await result.current.fetchRepositories();
    });

    expect(() => {
      act(() => {
        result.current.handleSelectRepository("r1");
      });
    }).not.toThrow();
  });

  it("handleChangeRepository triggers repo fetch", async () => {
    const { result } = renderHook(() => useGitHubSettings(defaultProps));

    await act(async () => {
      result.current.handleChangeRepository();
    });

    // After handleChangeRepository, fetchRepositories should be called
    expect(mockFetch).toHaveBeenCalled();
  });

  it("fetchLabels with empty response sets empty array", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ labels: [] }),
    });

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
