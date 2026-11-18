import { describe, expect, it } from "vitest";
import { commandItems, groupLabels } from "./command-items";

describe("command-items", () => {
  describe("commandItems", () => {
    it("all item ids are unique", () => {
      const ids = commandItems.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("non-org items do not have $orgSlug in href", () => {
      const nonOrgItems = commandItems.filter((i) => !i.requiresOrg);
      for (const item of nonOrgItems) {
        expect(item.href).not.toContain("$orgSlug");
      }
    });
  });

  describe("groupLabels", () => {
    it("has a label for every group in use", () => {
      for (const item of commandItems) {
        expect(groupLabels[item.group]).toBeTruthy();
      }
    });
  });
});
