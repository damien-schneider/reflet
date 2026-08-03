import { describe, expect, it, vi } from "vitest";
import { runDoctor } from "../commands/doctor";
import { runInit } from "../commands/init";
import type { FileSystemPort, PackageManager } from "../project";

const NEXT_LAYOUT = `export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;

function project(extra: Record<string, string> = {}) {
  const store = new Map<string, string>(
    Object.entries({
      "/app/app/layout.tsx": NEXT_LAYOUT,
      "/app/bun.lock": "",
      "/app/package.json": '{ "name": "demo", "dependencies": {} }',
      ...extra,
    })
  );

  const files: FileSystemPort = {
    exists: (path) => store.has(path),
    read: (path) => store.get(path) ?? null,
    write: (path, content) => {
      store.set(path, content);
    },
  };

  return { files, store };
}

function init(
  overrides: Partial<Parameters<typeof runInit>[0]> = {},
  extra: Record<string, string> = {}
) {
  const { files, store } = project(extra);
  const install = vi.fn<(manager: PackageManager) => void>();

  const report = runInit({
    cwd: "/app",
    dryRun: false,
    files,
    install,
    skipInstall: false,
    ...overrides,
  });

  return { install, report, store };
}

describe("runInit", () => {
  it("mounts the widget in the detected entry file", () => {
    const { report, store } = init({ publicKey: "fb_pub_abc" });

    expect(report.framework).toBe("next-app");
    expect(store.get("/app/app/layout.tsx")).toContain(
      'import { RefletFeedback } from "reflet-sdk/feedback";'
    );
    expect(store.get("/app/app/layout.tsx")).toContain(
      "<RefletFeedback publicKey={process.env.NEXT_PUBLIC_REFLET_PUBLIC_KEY} />"
    );
  });

  it("writes the public key to the env file the framework reads", () => {
    const { store } = init({ publicKey: "fb_pub_abc" });

    expect(store.get("/app/.env.local")).toBe(
      "NEXT_PUBLIC_REFLET_PUBLIC_KEY=fb_pub_abc\n"
    );
  });

  it("leaves a blank placeholder when no key was given", () => {
    const { report, store } = init();

    expect(store.get("/app/.env.local")).toBe(
      "NEXT_PUBLIC_REFLET_PUBLIC_KEY=\n"
    );
    expect(
      report.changes.find((change) => change.path.endsWith(".env.local"))?.note
    ).toBe("fill in your public key");
  });

  it("never clobbers a key that is already configured", () => {
    const { store } = init(
      {},
      { "/app/.env.local": "NEXT_PUBLIC_REFLET_PUBLIC_KEY=fb_pub_existing\n" }
    );

    expect(store.get("/app/.env.local")).toBe(
      "NEXT_PUBLIC_REFLET_PUBLIC_KEY=fb_pub_existing\n"
    );
  });

  it("installs the sdk with the detected package manager", () => {
    const { install } = init();

    expect(install).toHaveBeenCalledWith("bun");
  });

  it("skips the install when the dependency is already declared", () => {
    const { install, report } = init(
      {},
      { "/app/package.json": '{ "dependencies": { "reflet-sdk": "^0.2.0" } }' }
    );

    expect(install).not.toHaveBeenCalled();
    expect(report.installed).toBe(true);
  });

  it("touches nothing on a dry run", () => {
    const { install, store } = init({ dryRun: true, publicKey: "fb_pub_abc" });

    expect(install).not.toHaveBeenCalled();
    expect(store.get("/app/app/layout.tsx")).toBe(NEXT_LAYOUT);
    expect(store.has("/app/.env.local")).toBe(false);
  });

  it("stays idempotent when run twice", () => {
    const { files, store } = project();
    const input = {
      cwd: "/app",
      dryRun: false,
      files,
      install: vi.fn(),
      publicKey: "fb_pub_abc",
      skipInstall: true,
    };

    runInit(input);
    const first = store.get("/app/app/layout.tsx");
    const report = runInit(input);

    expect(store.get("/app/app/layout.tsx")).toBe(first);
    expect(report.changes[0]?.status).toBe("unchanged");
  });

  it("passes the requested position through to the snippet", () => {
    const { store } = init({ position: "bottom-left" });

    expect(store.get("/app/app/layout.tsx")).toContain(
      '<RefletFeedback position="bottom-left" publicKey={'
    );
  });

  it("falls back to a manual snippet when no entry file exists", () => {
    const { files } = project();
    const report = runInit({
      cwd: "/empty",
      dryRun: false,
      files,
      install: vi.fn(),
      skipInstall: true,
    });

    expect(report.framework).toBe("unknown");
    expect(report.changes[0]?.status).toBe("skipped");
    expect(report.snippet).toContain("<RefletFeedback");
  });

  it("reports when the entry file has no place to mount the widget", () => {
    const { report } = init(
      {},
      { "/app/app/layout.tsx": "export default function L() { return null; }" }
    );

    expect(report.changes[0]).toEqual({
      note: "no place to mount the widget — add the snippet yourself",
      path: "/app/app/layout.tsx",
      status: "skipped",
    });
  });
});

describe("runDoctor", () => {
  it("passes on a fully configured project", () => {
    const { files } = project();
    runInit({
      cwd: "/app",
      dryRun: false,
      files,
      install: vi.fn(),
      publicKey: "fb_pub_abc",
      skipInstall: true,
    });
    files.write(
      "/app/package.json",
      '{ "dependencies": { "reflet-sdk": "^0.2.0" } }'
    );

    const { checks, ok } = runDoctor(files, "/app");

    expect(ok).toBe(true);
    expect(checks.every((check) => check.ok)).toBe(true);
  });

  it("points at what is missing", () => {
    const { files } = project();

    const { checks, ok } = runDoctor(files, "/app");

    expect(ok).toBe(false);
    const failed = checks
      .filter((check) => !check.ok)
      .map((check) => check.label);
    expect(failed).toEqual([
      "reflet-sdk installed",
      "widget mounted",
      "NEXT_PUBLIC_REFLET_PUBLIC_KEY set",
    ]);
    expect(checks.every((check) => check.ok || check.hint)).toBe(true);
  });
});
