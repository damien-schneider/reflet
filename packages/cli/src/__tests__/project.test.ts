import { describe, expect, it } from "vitest";
import { upsertEnvVar } from "../env-file";
import {
  detectPackageManager,
  detectProject,
  type FileSystemPort,
} from "../project";

function memoryFiles(paths: Record<string, string>): FileSystemPort {
  const store = new Map(Object.entries(paths));
  return {
    exists: (path) => store.has(path),
    read: (path) => store.get(path) ?? null,
    write: (path, content) => {
      store.set(path, content);
    },
  };
}

describe("detectPackageManager", () => {
  it("prefers the lockfile that is actually present", () => {
    expect(
      detectPackageManager(memoryFiles({ "/app/bun.lock": "" }), "/app")
    ).toBe("bun");
    expect(
      detectPackageManager(memoryFiles({ "/app/pnpm-lock.yaml": "" }), "/app")
    ).toBe("pnpm");
    expect(
      detectPackageManager(memoryFiles({ "/app/yarn.lock": "" }), "/app")
    ).toBe("yarn");
  });

  it("recognises the legacy bun lockfile", () => {
    expect(
      detectPackageManager(memoryFiles({ "/app/bun.lockb": "" }), "/app")
    ).toBe("bun");
  });

  it("falls back to npm", () => {
    expect(detectPackageManager(memoryFiles({}), "/app")).toBe("npm");
  });
});

describe("detectProject", () => {
  it("finds a Next.js app router layout under src", () => {
    const setup = detectProject(
      memoryFiles({ "/app/src/app/layout.tsx": "" }),
      "/app"
    );

    expect(setup.framework).toBe("next-app");
    expect(setup.entryFile).toBe("/app/src/app/layout.tsx");
    expect(setup.anchor).toEqual({ kind: "before", token: "</body>" });
    expect(setup.envFile).toBe("/app/.env.local");
    expect(setup.envKey).toBe("NEXT_PUBLIC_REFLET_PUBLIC_KEY");
    expect(setup.keyExpression).toBe(
      "process.env.NEXT_PUBLIC_REFLET_PUBLIC_KEY"
    );
  });

  it("finds a Next.js app router layout at the root", () => {
    const setup = detectProject(
      memoryFiles({ "/app/app/layout.tsx": "" }),
      "/app"
    );

    expect(setup.entryFile).toBe("/app/app/layout.tsx");
  });

  it("falls back to the pages router", () => {
    const setup = detectProject(
      memoryFiles({ "/app/pages/_app.tsx": "" }),
      "/app"
    );

    expect(setup.framework).toBe("next-pages");
    expect(setup.anchor).toEqual({
      kind: "wrap",
      token: "<Component {...pageProps} />",
    });
  });

  it("prefers the app router when both routers exist", () => {
    const setup = detectProject(
      memoryFiles({ "/app/app/layout.tsx": "", "/app/pages/_app.tsx": "" }),
      "/app"
    );

    expect(setup.framework).toBe("next-app");
  });

  it("detects a React Router root", () => {
    const setup = detectProject(
      memoryFiles({ "/app/app/root.tsx": "" }),
      "/app"
    );

    expect(setup.framework).toBe("react-router");
    expect(setup.envKey).toBe("VITE_REFLET_PUBLIC_KEY");
    expect(setup.keyExpression).toBe("import.meta.env.VITE_REFLET_PUBLIC_KEY");
    expect(setup.envFile).toBe("/app/.env");
  });

  it("detects a Vite react entry", () => {
    const setup = detectProject(
      memoryFiles({ "/app/src/main.tsx": "" }),
      "/app"
    );

    expect(setup.framework).toBe("vite-react");
    expect(setup.anchor).toEqual({ kind: "wrap", token: "<App />" });
  });

  it("reports an unknown project without an entry file", () => {
    const setup = detectProject(memoryFiles({}), "/app");

    expect(setup.framework).toBe("unknown");
    expect(setup.entryFile).toBeNull();
  });
});

describe("upsertEnvVar", () => {
  it("creates the file content when it is empty", () => {
    expect(upsertEnvVar("", "KEY", "fb_pub_1")).toBe("KEY=fb_pub_1\n");
  });

  it("appends to existing variables", () => {
    expect(upsertEnvVar("OTHER=1\n", "KEY", "fb_pub_1")).toBe(
      "OTHER=1\nKEY=fb_pub_1\n"
    );
  });

  it("adds the missing trailing newline before appending", () => {
    expect(upsertEnvVar("OTHER=1", "KEY", "fb_pub_1")).toBe(
      "OTHER=1\nKEY=fb_pub_1\n"
    );
  });

  it("replaces an existing value in place", () => {
    expect(upsertEnvVar("A=1\nKEY=old\nB=2\n", "KEY", "new")).toBe(
      "A=1\nKEY=new\nB=2\n"
    );
  });

  it("ignores a commented out declaration", () => {
    expect(upsertEnvVar("# KEY=old\n", "KEY", "new")).toBe(
      "# KEY=old\nKEY=new\n"
    );
  });

  it("quotes values that would otherwise break parsing", () => {
    expect(upsertEnvVar("", "KEY", "a b")).toBe('KEY="a b"\n');
  });
});
