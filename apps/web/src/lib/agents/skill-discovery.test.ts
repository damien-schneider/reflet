import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { publishedSkill } from "./published-skill";

describe("published skill discovery", () => {
  it("advertises the exact served artifact and its integrity digest", async () => {
    const { index, manifest } = await publishedSkill();
    for (const skill of index.skills) {
      const artifact = await readFile(
        join(process.cwd(), "public", new URL(skill.url).pathname)
      );
      expect(skill.digest).toBe(
        `sha256:${createHash("sha256").update(artifact).digest("hex")}`
      );
      expect(artifact.toString()).toContain(`name: ${skill.name}`);
      expect(manifest.entries[0]?.url).toBe(skill.url);
    }
  });
});
