import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { z } from "zod";

const liveHubFileSchema = z.object({
  pid: z.number().int().positive(),
  port: z.number().int().min(1).max(65_535),
  secret: z.string().regex(/^[0-9a-f]{64}$/),
});
export type LiveHubFile = z.infer<typeof liveHubFileSchema>;

export const liveHubFilePath = () => join(homedir(), ".reflet", "live.json");

export async function readLiveHubFile(): Promise<LiveHubFile | null> {
  try {
    const parsed = liveHubFileSchema.safeParse(
      JSON.parse(await readFile(liveHubFilePath(), "utf8"))
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function writeLiveHubFile(file: LiveHubFile): Promise<void> {
  const path = liveHubFilePath();
  await mkdir(dirname(path), { mode: 0o700, recursive: true });
  const temporaryFile = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryFile, `${JSON.stringify(file)}\n`, {
      flag: "wx",
      mode: 0o600,
    });
    await rename(temporaryFile, path);
  } finally {
    await rm(temporaryFile, { force: true });
  }
}

export async function removeLiveHubFile(pid: number): Promise<void> {
  const current = await readLiveHubFile();
  if (current?.pid === pid) {
    await rm(liveHubFilePath(), { force: true });
  }
}
