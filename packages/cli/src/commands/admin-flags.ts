import type { RefletAdminClient } from "../api/client";

export type Flags = Record<string, string | undefined>;

export interface CommandSpec {
  args?: string;
  flags?: string[];
  run: (
    client: RefletAdminClient,
    positional: string[],
    flags: Flags
  ) => Promise<unknown>;
}

export function arg(positional: string[], index: number, name: string): string {
  const value = positional[index];
  if (!value) {
    throw new Error(`Missing <${name}>`);
  }
  return value;
}

export function bool(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return;
  }
  if (value === "true" || value === "false") {
    return value === "true";
  }
  throw new Error(`Expected true or false, got "${value}"`);
}

export function num(value: string | undefined): number | undefined {
  if (value === undefined) {
    return;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Expected a number, got "${value}"`);
  }
  return parsed;
}

export function list(value: string | undefined): string[] | undefined {
  return value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function timestamp(value: string | undefined): number | undefined {
  if (value === undefined) {
    return;
  }
  const parsed = Number(value) || Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Expected epoch ms or ISO date, got "${value}"`);
  }
  return parsed;
}

export function json<T>(value: string | undefined): T | undefined {
  return value === undefined ? undefined : JSON.parse(value);
}

export function req(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing --${name}`);
  }
  return value;
}

export function choice<T extends string>(
  value: string,
  allowed: readonly T[]
): T {
  const match = allowed.find((item) => item === value);
  if (!match) {
    throw new Error(`Expected one of ${allowed.join(", ")}, got "${value}"`);
  }
  return match;
}
