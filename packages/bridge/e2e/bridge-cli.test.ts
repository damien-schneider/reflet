import { execFileSync, spawn } from "node:child_process";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";

const REPO_FULL_NAME = "acme/reflet";
const SECRET_KEY = "fb_sec_e2e";
const BRANCH_REF = "refs/heads/reflet/product-brain/job-123";
const objectBodySchema = z.record(z.string(), z.unknown());

interface BridgeApiState {
  completedPrUrls: string[];
  events: string[];
  failures: string[];
}

interface BridgeProcessResult {
  signal: NodeJS.Signals | null;
  status: number | null;
  stderr: string;
  stdout: string;
}

function runGit(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", stdio: "pipe" }).trim();
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown
): void {
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    request.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const body = await readBody(request);
  return body ? JSON.parse(body) : {};
}

function readObject(value: unknown): Record<string, unknown> {
  return objectBodySchema.parse(value);
}

function readString(value: unknown, key: string): string {
  const field = readObject(value)[key];
  if (typeof field !== "string" || field.length === 0) {
    throw new Error(`Expected ${key}`);
  }
  return field;
}

function createBridgeApiServer(state: BridgeApiState): Server {
  return createServer((request, response) => {
    const requestPromise = handleBridgeRequest(state, request, response);
    requestPromise.catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Bridge API failed";
      sendJson(response, 500, { error: message });
    });
  });
}

async function handleBridgeRequest(
  state: BridgeApiState,
  request: IncomingMessage,
  response: ServerResponse
): Promise<void> {
  if (request.headers.authorization !== `Bearer ${SECRET_KEY}`) {
    sendJson(response, 401, { error: "Unauthorized" });
    return;
  }
  const body = await readJson(request);
  const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
  switch (path) {
    case "/api/v1/admin/bridge/register":
      sendJson(response, 200, { bridgeInstallationId: "bridge-123" });
      return;
    case "/api/v1/admin/bridge/heartbeat":
      sendJson(response, 200, { success: true });
      return;
    case "/api/v1/admin/bridge/claim":
      sendJson(response, 200, {
        job: {
          id: "job-123",
          recipeId: "product-brain",
          recipeVersion: 1,
          title: "Build Product Brain",
          worktreeBranch: "reflet/product-brain/job-123",
        },
      });
      return;
    case "/api/v1/admin/bridge/event":
      state.events.push(readString(body, "message"));
      sendJson(response, 200, { success: true });
      return;
    case "/api/v1/admin/bridge/complete":
      state.completedPrUrls.push(readString(body, "prUrl"));
      sendJson(response, 200, { success: true });
      return;
    case "/api/v1/admin/bridge/fail":
      state.failures.push(readString(body, "failureReason"));
      sendJson(response, 200, { success: true });
      return;
    default:
      sendJson(response, 404, { error: "Not found" });
  }
}

function serverUrl(server: Server): string {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected TCP server address");
  }
  const socketAddress: AddressInfo = address;
  return `http://127.0.0.1:${socketAddress.port}`;
}

function listenServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    const handleListenError = (error: Error) => {
      reject(error);
    };
    server.once("error", handleListenError);
    server.listen({ host: "127.0.0.1", port: 0 }, () => {
      server.off("error", handleListenError);
      resolve();
    });
  });
}

function closeServer(server: Server): Promise<void> {
  if (!server.listening) {
    return Promise.resolve();
  }
  server.closeAllConnections();
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function createFakeGh(bin: string): Promise<void> {
  await writeFile(
    join(bin, "gh"),
    [
      "#!/bin/sh",
      'if [ "$1" = "--version" ]; then echo gh version 2.0.0; exit 0; fi',
      'if [ "$1" = "auth" ]; then exit 0; fi',
      'if [ "$1" = "pr" ] && [ "$2" = "create" ]; then echo created > "$REFLET_PR_STATE"; echo https://github.com/acme/reflet/pull/42; exit 0; fi',
      'if [ "$1" = "pr" ] && [ "$2" = "view" ] && [ -f "$REFLET_PR_STATE" ]; then echo https://github.com/acme/reflet/pull/42; exit 0; fi',
      "exit 1",
    ].join("\n")
  );
  await chmod(join(bin, "gh"), 0o755);
}

async function createFakeClaude(bin: string): Promise<void> {
  await writeFile(
    join(bin, "claude"),
    [
      "#!/bin/sh",
      'if [ "$1" = "auth" ]; then exit 0; fi',
      "mkdir -p .reflet/strategy",
      "cat > .reflet/strategy/product-brain.md <<'EOF'",
      "# Product Brain",
      "",
      "## Evidence",
      "- README.md",
      "EOF",
      "git add .reflet/strategy/product-brain.md",
      "git commit -m 'Add Reflet Product Brain'",
      "git push -u origin HEAD",
      "gh pr create --draft --title 'Reflet Product Brain' --body 'Generated by Reflet Bridge'",
      'echo \'{"session_id":"cli-e2e-session"}\'',
    ].join("\n")
  );
  await chmod(join(bin, "claude"), 0o755);
}

async function createTempRepo(
  root: string
): Promise<{ remote: string; repo: string }> {
  const remote = join(root, "remote.git");
  const repo = join(root, "repo");
  runGit(["init", "--bare", remote]);
  runGit(["init", repo]);
  runGit(["-C", repo, "config", "user.email", "bridge@example.com"]);
  runGit(["-C", repo, "config", "user.name", "Reflet Bridge"]);
  await writeFile(join(repo, "README.md"), "Reflet test repo\n");
  await writeFile(join(repo, ".gitignore"), ".reflet.local/\n");
  runGit(["-C", repo, "add", "README.md", ".gitignore"]);
  runGit(["-C", repo, "commit", "-m", "init"]);
  runGit(["-C", repo, "remote", "add", "origin", remote]);
  runGit(["-C", repo, "push", "-u", "origin", "HEAD"]);
  return { remote, repo };
}

function runBridgeProcess(input: {
  args: string[];
  command: string;
  cwd: string;
  env: NodeJS.ProcessEnv;
}): Promise<BridgeProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(input.command, input.args, {
      cwd: input.cwd,
      env: input.env,
    });
    const stderr: Uint8Array[] = [];
    const stdout: Uint8Array[] = [];
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
    }, 30_000);
    child.stderr.on("data", (chunk: Uint8Array) => stderr.push(chunk));
    child.stdout.on("data", (chunk: Uint8Array) => stdout.push(chunk));
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (status, signal) => {
      clearTimeout(timeout);
      resolve({
        signal,
        status,
        stderr: Buffer.concat(stderr).toString("utf8"),
        stdout: Buffer.concat(stdout).toString("utf8"),
      });
    });
  });
}

function expectSuccessfulBridgeRun({
  branch,
  bridge,
  remote,
  state,
}: {
  branch: string;
  bridge: BridgeProcessResult;
  remote: string;
  state: BridgeApiState;
}): void {
  expect({
    completedPrUrls: state.completedPrUrls,
    events: state.events,
    failures: state.failures,
    signal: bridge.signal,
    status: bridge.status,
    stdout: bridge.stdout,
  }).toEqual({
    completedPrUrls: ["https://github.com/acme/reflet/pull/42"],
    events: [
      "Claimed Build Product Brain",
      "Draft PR ready: https://github.com/acme/reflet/pull/42",
    ],
    failures: [],
    signal: null,
    status: 0,
    stdout: "",
  });
  expect(["", "Saved lockfile"]).toContain(bridge.stderr.trim());

  const branchRef = runGit(["--git-dir", remote, "show-ref", branch]);
  expect(branchRef).toContain(branch);
}

describe("Reflet Bridge CLI E2E", () => {
  it("claims a Convex HTTP job, runs Claude in a worktree, pushes, and completes", async () => {
    const root = await mkdtemp(join(tmpdir(), "reflet-bridge-cli-e2e-"));
    const bin = join(root, "bin");
    const prState = join(root, "pr-created");
    const state: BridgeApiState = {
      completedPrUrls: [],
      events: [],
      failures: [],
    };
    const server = createBridgeApiServer(state);

    try {
      await mkdir(bin, { recursive: true });
      const { remote, repo } = await createTempRepo(root);
      await createFakeGh(bin);
      await createFakeClaude(bin);
      await listenServer(server);

      const bridge = await runBridgeProcess({
        args: [
          join(process.cwd(), "src", "cli.ts"),
          "run-once",
          "--site-url",
          serverUrl(server),
          "--repo",
          repo,
          "--repo-full-name",
          REPO_FULL_NAME,
        ],
        command: "bun",
        cwd: repo,
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH ?? ""}`,
          REFLET_PR_STATE: prState,
          REFLET_SECRET_KEY: SECRET_KEY,
        },
      });

      expectSuccessfulBridgeRun({ branch: BRANCH_REF, bridge, remote, state });
    } finally {
      await closeServer(server);
      await rm(root, { force: true, recursive: true });
    }
  }, 60_000);

  it("runs the web-hosted Bridge tarball through the same autonomous loop", async () => {
    const root = await mkdtemp(join(tmpdir(), "reflet-bridge-tarball-e2e-"));
    const bin = join(root, "bin");
    const prState = join(root, "pr-created");
    const tarballPath = join(
      process.cwd(),
      "../../apps/web/public/downloads/reflet-bridge-0.1.0.tgz"
    );
    const state: BridgeApiState = {
      completedPrUrls: [],
      events: [],
      failures: [],
    };
    const server = createBridgeApiServer(state);

    try {
      execFileSync("bun", ["run", "build"], {
        cwd: process.cwd(),
        stdio: "pipe",
      });

      await mkdir(bin, { recursive: true });
      const { remote, repo } = await createTempRepo(root);
      await createFakeGh(bin);
      await createFakeClaude(bin);
      await listenServer(server);

      const bridge = await runBridgeProcess({
        args: [
          "--package",
          `file://${tarballPath}`,
          "reflet-bridge",
          "run-once",
          "--site-url",
          serverUrl(server),
          "--repo",
          repo,
          "--repo-full-name",
          REPO_FULL_NAME,
        ],
        command: "bunx",
        cwd: repo,
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH ?? ""}`,
          REFLET_PR_STATE: prState,
          REFLET_SECRET_KEY: SECRET_KEY,
        },
      });

      expectSuccessfulBridgeRun({ branch: BRANCH_REF, bridge, remote, state });
    } finally {
      await closeServer(server);
      await rm(root, { force: true, recursive: true });
    }
  }, 60_000);
});
