import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { BASE_URL } from "@/lib/seo-config";

export const documentName = z.enum([
  "overview",
  "authentication",
  "integration",
]);
const AUTHENTICATION_PATH = "auth.md";
const INTEGRATION_PATH = ".well-known/agent-skills/reflet-feedback/SKILL.md";
const OVERVIEW_PATH = "llms.txt";
const DOCUMENT_PATHS = {
  authentication: AUTHENTICATION_PATH,
  integration: INTEGRATION_PATH,
  overview: OVERVIEW_PATH,
} satisfies Record<z.infer<typeof documentName>, string>;

// Static reads keep Next's file tracer from bundling unrelated public assets.
const DOCUMENT_READERS = {
  authentication: () =>
    readFile(join(process.cwd(), "public", AUTHENTICATION_PATH), "utf8"),
  integration: () =>
    readFile(join(process.cwd(), "public", INTEGRATION_PATH), "utf8"),
  overview: () =>
    readFile(join(process.cwd(), "public", OVERVIEW_PATH), "utf8"),
} satisfies Record<z.infer<typeof documentName>, () => Promise<string>>;

export function documentationUri(document: z.infer<typeof documentName>) {
  return new URL(DOCUMENT_PATHS[document], BASE_URL).href;
}

export async function readDocumentation(
  document: z.infer<typeof documentName>
) {
  return {
    mimeType: "text/markdown",
    text: await DOCUMENT_READERS[document](),
    uri: documentationUri(document),
  };
}
