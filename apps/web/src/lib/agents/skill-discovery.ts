import { createHash } from "node:crypto";
import { BASE_URL, SITE_NAME } from "@/lib/seo-config";

const SKILL_NAME = /^name: (.+)$/m;
const SKILL_DESCRIPTION = /^description: (.+)$/m;

export function skillDiscovery(markdown: string) {
  const name = SKILL_NAME.exec(markdown)?.[1];
  const description = SKILL_DESCRIPTION.exec(markdown)?.[1];
  if (!(name && description)) {
    throw new Error("Published agent skill is missing its name or description");
  }
  const url = new URL(`/.well-known/agent-skills/${name}/SKILL.md`, BASE_URL)
    .href;
  return {
    index: {
      $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
      skills: [
        {
          description,
          digest: `sha256:${createHash("sha256").update(markdown).digest("hex")}`,
          name,
          type: "skill-md",
          url,
        },
      ],
    },
    manifest: {
      entries: [
        {
          description,
          displayName: name,
          identifier: `urn:air:${new URL(BASE_URL).hostname}:skill:${name}`,
          representativeQueries: [
            "Read the feedback queue for my Reflet organization",
            "Update the status of a Reflet feedback item",
          ],
          type: "application/ai-skill+md",
          url,
        },
      ],
      host: {
        displayName: SITE_NAME,
        identifier: new URL(BASE_URL).hostname,
      },
      specVersion: "1.0",
    },
  };
}
