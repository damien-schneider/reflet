import { toast } from "@ctrl-ui/react/ui/toast";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AGENTS, openCloudAgent, openDeepLink } from "./agent-config";

vi.mock("@ctrl-ui/react/ui/toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe("agent-config", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("AGENTS", () => {
    it("should have unique ids", () => {
      const ids = AGENTS.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("openDeepLink", () => {
    let windowOpenSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    });

    it("should open cursor deep link and return true", () => {
      const result = openDeepLink("cursor", "Fix the bug");
      expect(result).toBe(true);
      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining("cursor://anysphere.cursor-tools/openComposer"),
        "_blank",
        "noopener,noreferrer"
      );
    });

    it("should encode prompt in cursor deep link", () => {
      openDeepLink("cursor", "Fix the bug & test");
      const url = windowOpenSpy.mock.calls[0][0] as string;
      expect(url).toContain(encodeURIComponent("Fix the bug & test"));
    });

    it("should open vscode-copilot deep link and return true", () => {
      const result = openDeepLink("vscode-copilot", "Hello");
      expect(result).toBe(true);
      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining("vscode://GitHub.copilot-chat/openChat"),
        "_blank",
        "noopener,noreferrer"
      );
    });

    it("should open windsurf deep link and return true", () => {
      const result = openDeepLink("windsurf", "Hello");
      expect(result).toBe(true);
      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining("windsurf://codeium.windsurf/openChat"),
        "_blank",
        "noopener,noreferrer"
      );
    });

    it("should return false for unknown agent id", () => {
      const result = openDeepLink("unknown-agent", "Hello");
      expect(result).toBe(false);
      expect(windowOpenSpy).not.toHaveBeenCalled();
    });
  });

  describe("openCloudAgent", () => {
    let windowOpenSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    });

    it("should open copilot-workspace with repository and return true", () => {
      const result = openCloudAgent(
        "copilot-workspace",
        "Fix the bug",
        "owner/repo"
      );
      expect(result).toBe(true);
      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "https://copilot-workspace.githubnext.com/owner/repo"
        ),
        "_blank",
        "noopener"
      );
    });

    it("should encode task parameter and truncate to 500 chars", () => {
      const longPrompt = "A".repeat(600);
      openCloudAgent("copilot-workspace", longPrompt, "owner/repo");
      const url = windowOpenSpy.mock.calls[0][0] as string;
      const taskParam = new URL(url).searchParams.get("task");
      expect(taskParam?.length).toBeLessThanOrEqual(500);
    });

    it("should show error toast when no repository provided", () => {
      const result = openCloudAgent("copilot-workspace", "Fix bug", null);
      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(
        "Connect a GitHub repository to use Copilot Workspace"
      );
      expect(windowOpenSpy).not.toHaveBeenCalled();
    });

    it("should return false for unknown agent id", () => {
      const result = openCloudAgent("unknown", "prompt", "owner/repo");
      expect(result).toBe(false);
      expect(windowOpenSpy).not.toHaveBeenCalled();
    });
  });
});
