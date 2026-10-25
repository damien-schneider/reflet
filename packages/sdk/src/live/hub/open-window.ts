import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";

interface Launcher {
  args: string[];
  command: string;
}

const MAC_BROWSERS = ["Google Chrome", "Microsoft Edge"];
const LINUX_BROWSERS = [
  "google-chrome",
  "google-chrome-stable",
  "chromium",
  "chromium-browser",
  "microsoft-edge",
];
const WINDOWS_BROWSERS = [
  join("Google", "Chrome", "Application", "chrome.exe"),
  join("Microsoft", "Edge", "Application", "msedge.exe"),
];
const WINDOWS_INSTALL_ROOTS = [
  "ProgramFiles",
  "ProgramFiles(x86)",
  "LocalAppData",
];

function macLauncher(url: string): Launcher {
  const browser = MAC_BROWSERS.find((name) =>
    [
      join("/Applications", `${name}.app`),
      join(homedir(), "Applications", `${name}.app`),
    ].some((path) => existsSync(path))
  );
  return browser
    ? { args: ["-na", browser, "--args", `--app=${url}`], command: "open" }
    : { args: [url], command: "open" };
}

function linuxLauncher(url: string): Launcher {
  const directories = (process.env.PATH ?? "").split(delimiter);
  const browser = LINUX_BROWSERS.find((name) =>
    directories.some(
      (directory) => directory && existsSync(join(directory, name))
    )
  );
  return browser
    ? { args: [`--app=${url}`], command: browser }
    : { args: [url], command: "xdg-open" };
}

function windowsLauncher(url: string): Launcher {
  const roots = WINDOWS_INSTALL_ROOTS.flatMap((name) => {
    const root = process.env[name];
    return root ? [root] : [];
  });
  for (const browser of WINDOWS_BROWSERS) {
    const executable = roots
      .map((root) => join(root, browser))
      .find((path) => existsSync(path));
    if (executable) {
      return { args: [`--app=${url}`], command: executable };
    }
  }
  return { args: ["/c", "start", '""', url], command: "cmd" };
}

function launcherFor(url: string): Launcher {
  switch (process.platform) {
    case "darwin":
      return macLauncher(url);
    case "win32":
      return windowsLauncher(url);
    default:
      return linuxLauncher(url);
  }
}

export function openLiveWindow(url: string): Promise<boolean> {
  const { args, command } = launcherFor(url);
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
      windowsVerbatimArguments: command === "cmd",
    });
    child.once("error", () => resolve(false));
    child.once("spawn", () => {
      child.unref();
      resolve(true);
    });
  });
}
