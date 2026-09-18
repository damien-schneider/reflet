import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { BASE_URL } from "@/lib/seo-config";

export const documentName = z.enum([
  "overview",
  "authentication",
  "integration",
]);
const DOCUMENT_PATHS = {
  authentication: "auth.md",
  integration: ".well-known/agent-skills/reflet-feedback/SKILL.md",
  overview: "llms.txt",
} satisfies Record<z.infer<typeof documentName>, string>;

export function documentationUri(document: z.infer<typeof documentName>) {
  return new URL(DOCUMENT_PATHS[document], BASE_URL).href;
}

export async function readDocumentation(
  document: z.infer<typeof documentName>
) {
  const path = DOCUMENT_PATHS[document];
  return {
    mimeType: "text/markdown",
    text: await readFile(join(process.cwd(), "public", path), "utf8"),
    uri: documentationUri(document),
  };
}
