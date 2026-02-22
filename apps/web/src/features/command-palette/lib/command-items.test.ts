import { describe, expect, it } from "vitest";
import { commandItems, groupLabels } from "./command-items";

describe("command-items", () => {
  describe("commandItems", () => {
    it("is a non-empty array", () => {
      expect(commandItems.length).toBeGreaterThan(0);
    });

    it("all items have required properties", () => {
      for (const item of commandItems) {
        expect(item.id).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(item.keywords).toBeInstanceOf(Array);
        expect(item.keywords.length).toBeGreaterThan(0);
        expect(item.group).toBeTruthy();
        expect(item.href).toBeTruthy();
        expect(item.icon).toBeDefined();
      }
    });

    it("all item ids are unique", () => {
      const ids = commandItems.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("all items have valid group values", () => {
      const validGroups = ["navigation", "settings", "actions"];
      for (const item of commandItems) {
        expect(validGroups).toContain(item.group);
      }
    });

    it("org-required items have $orgSlug in href", () => {
      const orgItems = commandItems.filter((i) => i.requiresOrg);
      for (const item of orgItems) {
        expect(item.href).toContain("$orgSlug");
      }
    });

    it("non-org items do not have $orgSlug in href", () => {
      const nonOrgItems = commandItems.filter((i) => !i.requiresOrg);
      for (const item of nonOrgItems) {
        expect(item.href).not.toContain("$orgSlug");
      }
    });

    it("has navigation items", () => {
      const navItems = commandItems.filter((i) => i.group === "navigation");
      expect(navItems.length).toBeGreaterThan(0);
    });

    it("has settings items", () => {
      const settingsItems = commandItems.filter((i) => i.group === "settings");
      expect(settingsItems.length).toBeGreaterThan(0);
    });

    it("has action items", () => {
      const actionItems = commandItems.filter((i) => i.group === "actions");
      expect(actionItems.length).toBeGreaterThan(0);
    });

    it("account item does not require org", () => {
      const account = commandItems.find((i) => i.id === "account");
      expect(account).toBeDefined();
      expect(account?.requiresOrg).toBeFalsy();
    });

    it("admin-required items also require org", () => {
      const adminItems = commandItems.filter((i) => i.requiresAdmin);
      for (const item of adminItems) {
        expect(item.requiresOrg).toBe(true);
      }
    });
  });

  describe("groupLabels", () => {
    it("has labels for all groups", () => {
      expect(groupLabels.navigation).toBe("Pages");
      expect(groupLabels.settings).toBe("Settings");
      expect(groupLabels.actions).toBe("Actions");
    });
  });
});
