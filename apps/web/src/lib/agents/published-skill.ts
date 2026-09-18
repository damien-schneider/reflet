import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { skillDiscovery } from "./skill-discovery";

export async function publishedSkill() {
  const markdown = await readFile(
    join(
      process.cwd(),
      "public/.well-known/agent-skills/reflet-feedback/SKILL.md"
    ),
    "utf8"
  );
  return skillDiscovery(markdown);
}
