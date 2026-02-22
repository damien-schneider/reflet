import { cleanup } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AGENTS, openCloudAgent, openDeepLink } from "./agent-config";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("agent-config", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("AGENTS", () => {
    it("should export an array of agent targets", () => {
      expect(Array.isArray(AGENTS)).toBe(true);
      expect(AGENTS.length).toBeGreaterThan(0);
    });

    it("should have unique ids", () => {
      const ids = AGENTS.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("should include a copy-generic agent", () => {
      const copyAgent = AGENTS.find((a) => a.id === "copy-generic");
      expect(copyAgent).toBeDefined();
      expect(copyAgent?.type).toBe("copy");
      expect(copyAgent?.label).toBe("Copy prompt");
    });

    it("should include cursor deeplink agent", () => {
      const cursor = AGENTS.find((a) => a.id === "cursor");
      expect(cursor).toBeDefined();
      expect(cursor?.type).toBe("deeplink");
    });

    it("should include vscode-copilot deeplink agent", () => {
      const vscode = AGENTS.find((a) => a.id === "vscode-copilot");
      expect(vscode).toBeDefined();
      expect(vscode?.type).toBe("deeplink");
    });

    it("should include windsurf deeplink agent", () => {
      const windsurf = AGENTS.find((a) => a.id === "windsurf");
      expect(windsurf).toBeDefined();
      expect(windsurf?.type).toBe("deeplink");
    });

    it("should include copilot-workspace cloud agent", () => {
      const cw = AGENTS.find((a) => a.id === "copilot-workspace");
      expect(cw).toBeDefined();
      expect(cw?.type).toBe("cloud");
    });

    it("should have label, icon, type, and description for each agent", () => {
      for (const agent of AGENTS) {
        expect(agent.label).toBeTruthy();
        expect(agent.icon).toBeDefined();
        expect(agent.type).toBeTruthy();
        expect(agent.description).toBeTruthy();
      }
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
        "_blank"
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
        "_blank"
      );
    });

    it("should open windsurf deep link and return true", () => {
      const result = openDeepLink("windsurf", "Hello");
      expect(result).toBe(true);
      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining("windsurf://codeium.windsurf/openChat"),
        "_blank"
      );
    });

    it("should return false for unknown agent id", () => {
      const result = openDeepLink("unknown-agent", "Hello");
      expect(result).toBe(false);
      expect(windowOpenSpy).not.toHaveBeenCalled();
    });

    it("should encode special characters in prompt", () => {
      openDeepLink("cursor", "Fix <script>alert('xss')</script>");
      const url = windowOpenSpy.mock.calls[0][0] as string;
      expect(url).not.toContain("<script>");
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
