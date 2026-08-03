import { injectWidget } from "../codemod";
import { upsertEnvVar } from "../env-file";
import {
  detectPackageManager,
  detectProject,
  type FileSystemPort,
  type Framework,
  type PackageManager,
} from "../project";

export const SDK_PACKAGE = "reflet-sdk";
const IMPORT_LINE = `import { RefletFeedback } from "${SDK_PACKAGE}/feedback";`;

export type ChangeStatus = "created" | "skipped" | "unchanged" | "updated";

export interface InitChange {
  note?: string;
  path: string;
  status: ChangeStatus;
}

export interface InitReport {
  changes: InitChange[];
  entryFile: string | null;
  envKey: string;
  framework: Framework;
  installed: boolean;
  packageManager: PackageManager;
  snippet: string;
}

export interface InitInput {
  cwd: string;
  dryRun: boolean;
  files: FileSystemPort;
  install: (manager: PackageManager) => void;
  position?: string;
  publicKey?: string;
  skipInstall: boolean;
}

function buildSnippet(keyExpression: string, position?: string): string {
  const props = [
    position ? `position="${position}"` : null,
    `publicKey={${keyExpression}}`,
  ].filter(Boolean);

  return `<RefletFeedback ${props.join(" ")} />`;
}

function hasDependency(files: FileSystemPort, cwd: string): boolean {
  const manifest = files.read(`${cwd}/package.json`);
  return manifest ? manifest.includes(`"${SDK_PACKAGE}"`) : false;
}

function mountWidget(
  input: InitInput,
  entryFile: string,
  anchor: Parameters<typeof injectWidget>[1]["anchor"],
  snippet: string
): InitChange {
  const source = input.files.read(entryFile);
  if (source === null) {
    return {
      note: "file could not be read",
      path: entryFile,
      status: "skipped",
    };
  }

  const result = injectWidget(source, {
    anchor,
    importLine: IMPORT_LINE,
    snippet,
  });

  if (!result.changed) {
    return {
      note:
        result.reason === "already-installed"
          ? "widget already mounted"
          : "no place to mount the widget — add the snippet yourself",
      path: entryFile,
      status: result.reason === "already-installed" ? "unchanged" : "skipped",
    };
  }

  if (!input.dryRun) {
    input.files.write(entryFile, result.code);
  }
  return { path: entryFile, status: "updated" };
}

function writeEnvKey(
  input: InitInput,
  envFile: string,
  envKey: string
): InitChange {
  const existing = input.files.read(envFile);
  const alreadySet = new RegExp(`^\\s*${envKey}=.+$`, "m").test(existing ?? "");

  if (alreadySet && !input.publicKey) {
    return { path: envFile, status: "unchanged" };
  }

  const next = upsertEnvVar(existing ?? "", envKey, input.publicKey ?? "");
  if (next === existing) {
    return { path: envFile, status: "unchanged" };
  }

  if (!input.dryRun) {
    input.files.write(envFile, next);
  }
  return {
    note: input.publicKey ? undefined : "fill in your public key",
    path: envFile,
    status: existing === null ? "created" : "updated",
  };
}

/**
 * Installs the SDK, mounts the widget in the app entry file and records the
 * public key. Every step reports what it did so nothing happens silently.
 */
export function runInit(input: InitInput): InitReport {
  const packageManager = detectPackageManager(input.files, input.cwd);
  const project = detectProject(input.files, input.cwd);
  const snippet = buildSnippet(project.keyExpression, input.position);

  const changes: InitChange[] = [];

  const alreadyInstalled = hasDependency(input.files, input.cwd);
  const shouldInstall = !(
    alreadyInstalled ||
    input.skipInstall ||
    input.dryRun
  );
  if (shouldInstall) {
    input.install(packageManager);
  }

  if (project.entryFile) {
    changes.push(
      mountWidget(input, project.entryFile, project.anchor, snippet)
    );
  } else {
    changes.push({
      note: "no React entry file found — add the snippet yourself",
      path: input.cwd,
      status: "skipped",
    });
  }

  changes.push(writeEnvKey(input, project.envFile, project.envKey));

  return {
    changes,
    entryFile: project.entryFile,
    envKey: project.envKey,
    framework: project.framework,
    installed: shouldInstall || alreadyInstalled,
    packageManager,
    snippet: `${IMPORT_LINE}\n\n${snippet}`,
  };
}
