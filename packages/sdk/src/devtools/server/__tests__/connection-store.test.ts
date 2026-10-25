// @vitest-environment node
import { mkdtemp, readdir, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  listConnections,
  readConnection,
  saveConnection,
} from "../connect/connection-store";

const storageHome = await mkdtemp(join(tmpdir(), "reflet-connections-"));
vi.mock("node:os", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:os")>()),
  homedir: () => storageHome,
}));
afterAll(() => rm(storageHome, { force: true, recursive: true }));

const connection = (apiUrl: string) => ({
  apiUrl,
  organizationName: "Acme",
  token: "fb_dev_test",
});

describe("connection persistence", () => {
  it("preserves simultaneous connections from separate projects", async () => {
    const first = connection("https://api.example");
    await Promise.all([
      saveConnection("/first", first),
      saveConnection("/second", first),
    ]);
    expect(await readConnection("/first", first.apiUrl)).toEqual(first);
    expect(await readConnection("/second", first.apiUrl)).toEqual(first);
  });

  it("keeps development and production credentials separate", async () => {
    const production = connection("https://prod.example");
    const development = connection("https://dev.example");
    await saveConnection("/project", production);
    await saveConnection("/project", development);
    expect(await readConnection("/project", production.apiUrl)).toEqual(
      production
    );
    expect(await readConnection("/project", development.apiUrl)).toEqual(
      development
    );
  });
});

describe("listing connections for Reflet Live", () => {
  const globex = {
    apiUrl: "https://globex.example",
    organizationName: "Globex",
    token: "fb_dev_globex",
  };
  const globexOf = async () =>
    (await listConnections()).filter(
      (listed) => listed.organizationName === "Globex"
    );
  const ageSavedConnections = async () => {
    const directory = join(storageHome, ".reflet", "devtools");
    const yesterday = new Date(Date.now() - 86_400_000);
    for (const fileName of await readdir(directory)) {
      await utimes(join(directory, fileName), yesterday, yesterday);
    }
  };

  it("offers each organization once, with the most recently saved token", async () => {
    await saveConnection("/web", globex);
    const [before] = await globexOf();
    await ageSavedConnections();
    await saveConnection("/desktop", { ...globex, token: "fb_dev_fresh" });
    await writeFile(
      join(storageHome, ".reflet", "devtools", "broken.json"),
      "{"
    );
    const listed = await globexOf();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.token).toBe("fb_dev_fresh");
    expect(listed[0]?.id).toBe(before?.id);
  });

  it("keeps the same id when the organization is reconnected", async () => {
    const [before] = await globexOf();
    await ageSavedConnections();
    await saveConnection("/web", { ...globex, token: "fb_dev_renewed" });
    const [after] = await globexOf();
    expect(after?.token).toBe("fb_dev_renewed");
    expect(after?.id).toBe(before?.id);
  });
});
