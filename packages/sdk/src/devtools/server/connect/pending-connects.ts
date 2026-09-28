import { createHash, randomBytes } from "node:crypto";

interface ConnectBinding {
  apiUrl: string;
  redirectUri: string;
  root: string;
}

interface PendingConnect {
  binding: ConnectBinding;
  codeVerifier: string;
  startedAt: number;
}

const PENDING_CONNECT_TTL_MS = 10 * 60_000;
const MAX_PENDING_CONNECTS = 10;
declare global {
  // Preserve pending connects across dev server module reloads.
  var refletDevtoolsPendingConnects: Map<string, PendingConnect> | undefined;
}

function pendingConnects(): Map<string, PendingConnect> {
  globalThis.refletDevtoolsPendingConnects ??= new Map();
  return globalThis.refletDevtoolsPendingConnects;
}

export function beginConnect(binding: ConnectBinding): {
  codeChallenge: string;
  codeVerifier: string;
  state: string;
} {
  const state = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  const pending = pendingConnects();
  while (pending.size >= MAX_PENDING_CONNECTS) {
    const oldestState = pending.keys().next().value;
    if (oldestState === undefined) {
      break;
    }
    pending.delete(oldestState);
  }
  pending.set(state, { binding, codeVerifier, startedAt: Date.now() });

  return { codeChallenge, codeVerifier, state };
}

export function takeConnect(
  state: string,
  binding: ConnectBinding
): { codeVerifier: string } | null {
  const pending = pendingConnects();
  const connect = pending.get(state);
  if (!connect) {
    return null;
  }
  if (Date.now() - connect.startedAt > PENDING_CONNECT_TTL_MS) {
    pending.delete(state);
    return null;
  }
  const matchesServer =
    connect.binding.root === binding.root &&
    connect.binding.apiUrl === binding.apiUrl &&
    connect.binding.redirectUri === binding.redirectUri;
  if (!matchesServer) {
    return null;
  }
  pending.delete(state);
  return { codeVerifier: connect.codeVerifier };
}
