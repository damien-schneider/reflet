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
const objectBodySchema = z.record(z.string(), z.unknown());

interface CompletedJob {
  artifactKinds: string[];
  hasContent: boolean;
  prUrl: string;
}

interface BridgeApiState {
  completed: CompletedJob[];
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

function readArtifactSummary(body: unknown): {
  artifactKinds: string[];
  hasContent: boolean;
} {
  const raw = readObject(body).artifacts;
  const artifacts = Array.isArray(raw) ? raw : [];
  const artifactKinds: string[] = [];
  let hasContent = false;
  for (const entry of artifacts) {
    const record = readObject(entry);
    if (typeof record.artifactKind === "string") {
      artifactKinds.push(record.artifactKind);
    }
    if (typeof record.content === "string" && record.content.length > 0) {
      hasContent = true;
    }
  }
  return { artifactKinds, hasContent };
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
    case "/api/v1/admin/bridge/seed-artifacts":
      sendJson(response, 200, { artifacts: [] });
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
    case "/api/v1/admin/bridge/complete": {
      const { artifactKinds, hasContent } = readArtifactSummary(body);
      const prUrlValue = readObject(body).prUrl;
      state.completed.push({
        artifactKinds,
        hasContent,
        prUrl: typeof prUrlValue === "string" ? prUrlValue : "",
      });
      sendJson(response, 200, { success: true });
      return;
    }
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
  // gh must never be invoked for the product-brain artifacts sink: any call
  // exits non-zero so a stray push/PR attempt would surface as a hard failure.
  await writeFile(
    join(bin, "gh"),
    [
      "#!/bin/sh",
      'if [ "$1" = "--version" ]; then echo gh version 2.0.0; exit 0; fi',
      'if [ "$1" = "auth" ]; then exit 0; fi',
      "exit 1",
    ].join("\n")
  );
  await chmod(join(bin, "gh"), 0o755);
}

async function createFakeClaude(bin: string): Promise<void> {
  // Artifacts-sink recipe: write the .reflet body only (no commit/push/PR).
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
  bridge,
  state,
}: {
  bridge: BridgeProcessResult;
  state: BridgeApiState;
}): void {
  expect({
    completed: state.completed,
    events: state.events,
    failures: state.failures,
    signal: bridge.signal,
    status: bridge.status,
    stdout: bridge.stdout,
  }).toEqual({
    completed: [
      {
        artifactKinds: ["product_brain"],
        hasContent: true,
        prUrl: "",
      },
    ],
    events: ["Claimed Build Product Brain", "Harvested 1 artifact(s)"],
    failures: [],
    signal: null,
    status: 0,
    stdout: "",
  });
  expect(["", "Saved lockfile"]).toContain(bridge.stderr.trim());
}

describe("Reflet Bridge CLI E2E", () => {
  it("claims a Convex HTTP job, runs Claude in a worktree, and harvests artifacts", async () => {
    const root = await mkdtemp(join(tmpdir(), "reflet-bridge-cli-e2e-"));
    const bin = join(root, "bin");
    const state: BridgeApiState = {
      completed: [],
      events: [],
      failures: [],
    };
    const server = createBridgeApiServer(state);

    try {
      await mkdir(bin, { recursive: true });
      const { repo } = await createTempRepo(root);
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
          REFLET_SECRET_KEY: SECRET_KEY,
        },
      });

      expectSuccessfulBridgeRun({ bridge, state });
    } finally {
      await closeServer(server);
      await rm(root, { force: true, recursive: true });
    }
  }, 60_000);

  it("runs the web-hosted Bridge tarball through the same autonomous loop", async () => {
    const root = await mkdtemp(join(tmpdir(), "reflet-bridge-tarball-e2e-"));
    const bin = join(root, "bin");
    const tarballPath = join(
      process.cwd(),
      "../../apps/web/public/downloads/reflet-bridge-0.1.0.tgz"
    );
    const extractDir = join(root, "extracted");
    const state: BridgeApiState = {
      completed: [],
      events: [],
      failures: [],
    };
    const server = createBridgeApiServer(state);

    try {
      // Build through turbo with --force so the bundled @reflet/harness (which
      // carries the recipe sinks) is always rebuilt from current source — a
      // cached harness dist would otherwise bundle stale recipes. The bridge
      // build's onSuccess hook regenerates the tarball from the fresh dist/.
      execFileSync(
        "bun",
        ["run", "build", "--filter=@reflet/bridge", "--force"],
        {
          cwd: join(process.cwd(), "../.."),
          stdio: "pipe",
        }
      );

      await mkdir(bin, { recursive: true });
      // Extract the freshly built tarball and run its bundled CLI directly.
      // `bunx --package file://<tgz>` caches its install by the package name,
      // so it can serve a stale extraction; extracting + running dist/cli.js
      // still exercises the exact packaged artifact without that cache.
      await mkdir(extractDir, { recursive: true });
      execFileSync("tar", ["-xzf", tarballPath, "-C", extractDir], {
        stdio: "pipe",
      });
      const bundledCli = join(extractDir, "package", "dist", "cli.js");
      const { repo } = await createTempRepo(root);
      await createFakeGh(bin);
      await createFakeClaude(bin);
      await listenServer(server);

      const bridge = await runBridgeProcess({
        args: [
          bundledCli,
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
          REFLET_SECRET_KEY: SECRET_KEY,
        },
      });

      expectSuccessfulBridgeRun({ bridge, state });
    } finally {
      await closeServer(server);
      await rm(root, { force: true, recursive: true });
    }
  }, 60_000);
});
