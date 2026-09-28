import type { BoardAccess } from "../../protocol";
import type { ResolvedDevtoolsOptions } from "../options";
import { isConnectableHost } from "./connectable-host";
import { readConnection } from "./connection-store";

export interface BoardCredential {
  isStored: boolean;
  token: string;
}

export async function boardCredential(
  settings: ResolvedDevtoolsOptions
): Promise<BoardCredential | null> {
  if (settings.secretKey) {
    return { isStored: false, token: settings.secretKey };
  }
  const connection = await readConnection(settings.root, settings.apiUrl);
  return connection ? { isStored: true, token: connection.token } : null;
}

export async function boardAccess(
  request: Request,
  settings: ResolvedDevtoolsOptions
): Promise<BoardAccess> {
  if (settings.secretKey) {
    return { kind: "secretKey" };
  }
  const connection = await readConnection(settings.root, settings.apiUrl);
  if (connection) {
    return { kind: "connected", organizationName: connection.organizationName };
  }
  return {
    canConnect: isConnectableHost(new URL(request.url).hostname),
    kind: "disconnected",
  };
}
