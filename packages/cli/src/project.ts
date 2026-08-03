import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { InjectionAnchor } from "./codemod";

export interface FileSystemPort {
  exists: (path: string) => boolean;
  read: (path: string) => string | null;
  write: (path: string, content: string) => void;
}

export const nodeFileSystem: FileSystemPort = {
  exists: (path) => existsSync(path),
  read: (path) => (existsSync(path) ? readFileSync(path, "utf8") : null),
  write: (path, content) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content, "utf8");
  },
};

export const PACKAGE_MANAGERS = ["bun", "pnpm", "yarn", "npm"] as const;
export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

export const FRAMEWORKS = [
  "next-app",
  "next-pages",
  "react-router",
  "vite-react",
  "unknown",
] as const;
export type Framework = (typeof FRAMEWORKS)[number];

export interface ProjectSetup {
  anchor: InjectionAnchor;
  entryFile: string | null;
  envFile: string;
  envKey: string;
  framework: Framework;
  keyExpression: string;
}

const LOCKFILES: [PackageManager, string[]][] = [
  ["bun", ["bun.lock", "bun.lockb"]],
  ["pnpm", ["pnpm-lock.yaml"]],
  ["yarn", ["yarn.lock"]],
];

export function detectPackageManager(
  files: FileSystemPort,
  root: string
): PackageManager {
  for (const [manager, lockfiles] of LOCKFILES) {
    if (lockfiles.some((name) => files.exists(`${root}/${name}`))) {
      return manager;
    }
  }
  return "npm";
}

const NEXT_ANCHOR: InjectionAnchor = { kind: "before", token: "</body>" };

const CANDIDATES: Array<{
  anchor: InjectionAnchor;
  framework: Framework;
  paths: string[];
}> = [
  {
    anchor: NEXT_ANCHOR,
    framework: "next-app",
    paths: [
      "src/app/layout.tsx",
      "app/layout.tsx",
      "src/app/layout.jsx",
      "app/layout.jsx",
    ],
  },
  {
    anchor: { kind: "wrap", token: "<Component {...pageProps} />" },
    framework: "next-pages",
    paths: [
      "src/pages/_app.tsx",
      "pages/_app.tsx",
      "src/pages/_app.jsx",
      "pages/_app.jsx",
    ],
  },
  {
    anchor: NEXT_ANCHOR,
    framework: "react-router",
    paths: ["app/root.tsx", "src/root.tsx"],
  },
  {
    anchor: { kind: "wrap", token: "<App />" },
    framework: "vite-react",
    paths: ["src/main.tsx", "src/main.jsx"],
  },
];

const NEXT_FRAMEWORKS: Framework[] = ["next-app", "next-pages"];

function envDetails(
  framework: Framework
): Pick<ProjectSetup, "envFile" | "envKey" | "keyExpression"> {
  if (NEXT_FRAMEWORKS.includes(framework)) {
    return {
      envFile: ".env.local",
      envKey: "NEXT_PUBLIC_REFLET_PUBLIC_KEY",
      keyExpression: "process.env.NEXT_PUBLIC_REFLET_PUBLIC_KEY",
    };
  }

  return {
    envFile: ".env",
    envKey: "VITE_REFLET_PUBLIC_KEY",
    keyExpression: "import.meta.env.VITE_REFLET_PUBLIC_KEY",
  };
}

/** Identifies the React entry file the widget should be mounted in. */
export function detectProject(
  files: FileSystemPort,
  root: string
): ProjectSetup {
  for (const candidate of CANDIDATES) {
    const match = candidate.paths.find((path) =>
      files.exists(`${root}/${path}`)
    );
    if (match) {
      const env = envDetails(candidate.framework);
      return {
        anchor: candidate.anchor,
        entryFile: `${root}/${match}`,
        framework: candidate.framework,
        ...env,
        envFile: `${root}/${env.envFile}`,
      };
    }
  }

  const env = envDetails("unknown");
  return {
    anchor: NEXT_ANCHOR,
    entryFile: null,
    framework: "unknown",
    ...env,
    envFile: `${root}/${env.envFile}`,
  };
}
