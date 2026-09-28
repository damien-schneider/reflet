import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

const storedConnectionSchema = z.object({
  apiUrl: z.url(),
  organizationName: z.string(),
  token: z.string().startsWith("fb_dev_"),
});
export type StoredConnection = z.infer<typeof storedConnectionSchema>;

const connectionsDirectory = () => join(homedir(), ".reflet", "devtools");

function connectionFile(root: string, apiUrl: string) {
  const key = createHash("sha256")
    .update(JSON.stringify([root, apiUrl]))
    .digest("hex");
  return join(connectionsDirectory(), `${key}.json`);
}

export async function readConnection(
  root: string,
  apiUrl: string
): Promise<StoredConnection | null> {
  try {
    const connection = storedConnectionSchema.parse(
      JSON.parse(await readFile(connectionFile(root, apiUrl), "utf8"))
    );
    return connection.apiUrl === apiUrl ? connection : null;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function saveConnection(
  root: string,
  connection: StoredConnection
): Promise<void> {
  await mkdir(connectionsDirectory(), { mode: 0o700, recursive: true });
  const file = connectionFile(root, connection.apiUrl);
  const temporaryFile = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryFile, `${JSON.stringify(connection)}\n`, {
      flag: "wx",
      mode: 0o600,
    });
    await rename(temporaryFile, file);
  } finally {
    await rm(temporaryFile, { force: true });
  }
}

export async function removeConnection(
  root: string,
  apiUrl: string,
  rejectedToken?: string
): Promise<StoredConnection | null> {
  const removed = await readConnection(root, apiUrl);
  if (!removed || (rejectedToken && removed.token !== rejectedToken)) {
    return null;
  }
  await rm(connectionFile(root, apiUrl), { force: true });
  return removed;
}
