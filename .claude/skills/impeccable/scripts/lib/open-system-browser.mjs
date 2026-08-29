import { spawn } from "node:child_process";

export function browserOpenCommand(
  url,
  {
    platform = process.platform,
    comspec = process.env.ComSpec || process.env.COMSPEC || "cmd.exe",
  } = {}
) {
  if (platform === "darwin") {
    return { args: [url], command: "open" };
  }
  if (platform === "win32") {
    return { args: ["/c", "start", "", url], command: comspec };
  }
  return { args: [url], command: "xdg-open" };
}

export function openSystemBrowser(
  url,
  {
    platform = process.platform,
    comspec = process.env.ComSpec || process.env.COMSPEC || "cmd.exe",
    spawnImpl = spawn,
  } = {}
) {
  const { command, args } = browserOpenCommand(url, { comspec, platform });
  try {
    const child = spawnImpl(command, args, { detached: true, stdio: "ignore" });
    child.on("error", () => {});
    child.unref();
    return true;
  } catch {
    return false;
  }
}
