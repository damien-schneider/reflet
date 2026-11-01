// @vitest-environment node
import { EventEmitter } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { openLiveWindow } from "../open-window";

const { spawnMock, spawnOutcome } = vi.hoisted(() => {
  const outcome = { event: "spawn" };
  return {
    spawnMock: vi.fn(() => {
      const child = Object.assign(new EventEmitter(), { unref: vi.fn() });
      queueMicrotask(() => child.emit(outcome.event, new Error("ENOENT")));
      return child;
    }),
    spawnOutcome: outcome,
  };
});
vi.mock("node:child_process", () => ({ spawn: spawnMock }));

const WINDOW_URL = "http://localhost:47417";
const directory = await mkdtemp(join(tmpdir(), "reflet-live-shell-"));
const shellPath = join(directory, "reflet-live-shell");
await writeFile(shellPath, "");
afterAll(() => rm(directory, { force: true, recursive: true }));

const platform = process.platform;

beforeEach(() => {
  Object.defineProperty(process, "platform", { value: "darwin" });
  spawnOutcome.event = "spawn";
  spawnMock.mockClear();
});

afterEach(() => {
  Object.defineProperty(process, "platform", { value: platform });
});

describe("openLiveWindow on macOS", () => {
  it("opens the native dial shell instead of a browser when it is installed", async () => {
    await expect(openLiveWindow(WINDOW_URL, { shellPath })).resolves.toBe(true);

    expect(spawnMock).toHaveBeenCalledOnce();
    expect(spawnMock).toHaveBeenCalledWith(
      shellPath,
      expect.arrayContaining([WINDOW_URL]),
      expect.objectContaining({ detached: true })
    );
  });

  it("falls back to a browser window when the shell is missing", async () => {
    await expect(
      openLiveWindow(WINDOW_URL, { shellPath: join(directory, "missing") })
    ).resolves.toBe(true);

    expect(spawnMock).toHaveBeenCalledWith(
      "open",
      expect.arrayContaining([expect.stringContaining(WINDOW_URL)]),
      expect.objectContaining({ detached: true })
    );
  });

  it("reports a shell that fails to start", async () => {
    spawnOutcome.event = "error";

    await expect(openLiveWindow(WINDOW_URL, { shellPath })).resolves.toBe(
      false
    );
  });
});
