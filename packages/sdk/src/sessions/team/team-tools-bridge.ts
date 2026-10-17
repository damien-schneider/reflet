export interface TeamToolsAccount {
  organizationName: string;
}

/** One Reflet API call; `path` is the API path, e.g. `/api/v1/sessions/list`. */
export interface TeamToolsCall {
  body?: string;
  method: "GET" | "POST";
  path: string;
  query?: Record<string, string>;
}

export interface TeamToolsReply {
  body: string;
  status: number;
}

/**
 * Team tools for a desktop app whose pages have no web origin Reflet can bind a
 * sign-in to, such as Electron's `file://`. The app's privileged process
 * implements it with `createTeamToolsHost` from `reflet-sdk/desktop` and keeps
 * the credential; the page only sees calls and replies.
 */
export interface TeamToolsBridge {
  account: () => Promise<TeamToolsAccount | null>;
  request: (call: TeamToolsCall) => Promise<TeamToolsReply>;
  /** Opens Reflet sign-in in the system browser; resolves once the member approves. Calling it again reopens the same sign-in. */
  signIn: () => Promise<TeamToolsAccount>;
  signOut: () => Promise<void>;
}
