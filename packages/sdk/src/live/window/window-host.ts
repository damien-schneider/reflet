interface ShellChannel {
  postMessage: (message: string) => void;
}

function isShellChannel(value: unknown): value is ShellChannel {
  return (
    typeof value === "object" &&
    value !== null &&
    "postMessage" in value &&
    typeof value.postMessage === "function"
  );
}

function shellChannel(): ShellChannel | null {
  const channel: unknown = Reflect.get(window, "ipc");
  return isShellChannel(channel) ? channel : null;
}

export function canDragWindow(): boolean {
  return shellChannel() !== null;
}

export function dragWindow(): void {
  shellChannel()?.postMessage("drag");
}

export function closeWindow(): void {
  const shell = shellChannel();
  if (shell) {
    shell.postMessage("close");
    return;
  }
  window.close();
}
