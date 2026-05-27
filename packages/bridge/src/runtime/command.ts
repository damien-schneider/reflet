const DEFAULT_INTERVAL_MS = 15_000;

export type BridgeCommand =
  | { kind: "doctor" }
  | {
      intervalMs: number;
      kind: "start";
      repoFullName: string | null;
      repoPath: string;
      siteUrl: string | null;
    }
  | {
      kind: "run-once";
      repoFullName: string | null;
      repoPath: string;
      siteUrl: string | null;
    };

function readOption(args: string[], option: string): string | null {
  const index = args.indexOf(option);
  if (index === -1) {
    return null;
  }
  return args[index + 1] ?? null;
}

function readInterval(args: string[]): number {
  const raw = readOption(args, "--interval-ms");
  if (!raw) {
    return DEFAULT_INTERVAL_MS;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_INTERVAL_MS;
}

export function parseBridgeCommand(args: string[]): BridgeCommand {
  const command = args[0] ?? "doctor";
  if (command === "start") {
    return {
      intervalMs: readInterval(args),
      kind: "start",
      repoFullName: readOption(args, "--repo-full-name"),
      repoPath: readOption(args, "--repo") ?? ".",
      siteUrl: readOption(args, "--site-url"),
    };
  }
  if (command === "run-once") {
    return {
      kind: "run-once",
      repoFullName: readOption(args, "--repo-full-name"),
      repoPath: readOption(args, "--repo") ?? ".",
      siteUrl: readOption(args, "--site-url"),
    };
  }
  return { kind: "doctor" };
}
