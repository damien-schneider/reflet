import { resolve } from "node:path";
import { DEFAULT_API_URL } from "../../client";
import { EDITORS, type EditorId } from "../protocol";

export interface DevtoolsServerOptions {
  /** Dev hostnames besides localhost, e.g. `app.test`. Falls back to REFLET_DEVTOOLS_HOSTS, comma-separated. */
  allowedHosts?: string[];
  /** Reflet API origin. Falls back to REFLET_API_URL, then the hosted API. */
  apiUrl?: string;
  /** Editor that "open in editor" links target. Falls back to REFLET_EDITOR. */
  editor?: EditorId;
  /** App directory source paths resolve against. Defaults to the working directory. */
  root?: string;
  /** Falls back to REFLET_SECRET_KEY. Never sent to the browser. */
  secretKey?: string;
}

export type DevtoolsEnv = Readonly<Record<string, string | undefined>>;

export interface ResolvedDevtoolsOptions {
  allowedHosts: string[];
  apiUrl: string;
  editor: EditorId;
  root: string;
  secretKey: string | null;
}

const DEFAULT_EDITOR: EditorId = "vscode";
const TRAILING_SLASHES = /\/+$/;

function isEditorId(value: string | undefined): value is EditorId {
  return EDITORS.some((editor) => editor === value);
}

function presentValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function resolveEditor(
  optionEditor: string | undefined,
  envEditor: string | undefined
): EditorId {
  if (isEditorId(optionEditor)) {
    return optionEditor;
  }
  const normalizedEnvEditor = presentValue(envEditor)?.toLowerCase();
  return isEditorId(normalizedEnvEditor) ? normalizedEnvEditor : DEFAULT_EDITOR;
}

export function resolveDevtoolsOptions(
  options: DevtoolsServerOptions,
  env: DevtoolsEnv
): ResolvedDevtoolsOptions {
  const apiUrl =
    presentValue(options.apiUrl) ??
    presentValue(env.REFLET_API_URL) ??
    DEFAULT_API_URL;

  return {
    allowedHosts: (
      options.allowedHosts ??
      presentValue(env.REFLET_DEVTOOLS_HOSTS)?.split(",") ??
      []
    )
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
    apiUrl: apiUrl.replace(TRAILING_SLASHES, ""),
    editor: resolveEditor(options.editor, env.REFLET_EDITOR),
    root: resolve(presentValue(options.root) ?? process.cwd()),
    secretKey:
      presentValue(options.secretKey) ??
      presentValue(env.REFLET_SECRET_KEY) ??
      null,
  };
}
