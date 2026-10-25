import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

const storedConnectionSchema = z.object({
  apiUrl: z.url(),
  organizationName: z.string(),
  token: z.string().startsWith("fb_dev_"),
});
export type StoredConnection = z.infer<typeof storedConnectionSchema>;

const JSON_EXTENSION = ".json";
const connectionsDirectory = () => join(homedir(), ".reflet", "devtools");

function connectionFile(root: string, apiUrl: string) {
  const key = createHash("sha256")
    .update(JSON.stringify([root, apiUrl]))
    .digest("hex");
  return join(connectionsDirectory(), `${key}${JSON_EXTENSION}`);
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

export interface ListedConnection extends StoredConnection {
  id: string;
}

interface DatedConnection {
  connection: StoredConnection;
  modifiedMs: number;
}

async function readDatedConnection(
  fileName: string
): Promise<DatedConnection | null> {
  const path = join(connectionsDirectory(), fileName);
  try {
    const [content, details] = await Promise.all([
      readFile(path, "utf8"),
      stat(path),
    ]);
    const parsed = storedConnectionSchema.safeParse(JSON.parse(content));
    return parsed.success
      ? { connection: parsed.data, modifiedMs: details.mtimeMs }
      : null;
  } catch {
    return null;
  }
}

export async function listConnections(): Promise<ListedConnection[]> {
  let fileNames: string[];
  try {
    fileNames = await readdir(connectionsDirectory());
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
  const dated = await Promise.all(
    fileNames
      .filter((fileName) => fileName.endsWith(JSON_EXTENSION))
      .map(readDatedConnection)
  );
  const newest = new Map<string, DatedConnection>();
  for (const entry of dated) {
    if (!entry) {
      continue;
    }
    const key = JSON.stringify([
      entry.connection.apiUrl,
      entry.connection.organizationName,
    ]);
    const current = newest.get(key);
    if (!current || entry.modifiedMs > current.modifiedMs) {
      newest.set(key, entry);
    }
  }
  return [...newest.entries()]
    .map(([key, { connection }]) => ({
      ...connection,
      id: createHash("sha256").update(key).digest("hex"),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
