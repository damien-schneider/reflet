// @vitest-environment node
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import { readConnection, saveConnection } from "../connect/connection-store";

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
