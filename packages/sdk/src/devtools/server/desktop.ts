import { createServer, type Server, type ServerResponse } from "node:http";
import type {
  TeamToolsAccount,
  TeamToolsBridge,
} from "../../sessions/team/team-tools-bridge";
import {
  connectAuthorizeUrl,
  connectCallbackUriFor,
  connectOutcomePage,
  forgetConnection,
  redeemConnectCode,
} from "./connect/connect-routes";
import { readConnection } from "./connect/connection-store";
import { htmlPage } from "./connect/html-page";
import { PENDING_CONNECT_TTL_MS } from "./connect/pending-connects";
import {
  type ResolvedDevtoolsOptions,
  resolveDevtoolsOptions,
} from "./options";
import { proxyWithBoardCredential } from "./reflet-proxy";

export type {
  TeamToolsAccount,
  TeamToolsBridge,
  TeamToolsCall,
  TeamToolsReply,
} from "../../sessions/team/team-tools-bridge";

export interface TeamToolsHostOptions {
  /** Reflet API origin. Defaults to the hosted API. */
  apiUrl?: string;
  /** A directory only this app uses, such as Electron's `app.getPath("userData")`. Keeps its sign-in apart from other apps and dev servers. */
  appDataDirectory: string;
  /** Reflet web app origin sign-in happens on. Defaults to https://www.reflet.app. */
  appUrl?: string;
  /** Opens a URL in the system browser, such as Electron's `shell.openExternal`. */
  openExternal: (url: string) => Promise<void>;
  publicKey: string;
}

interface BrowserSignIn {
  account: Promise<TeamToolsAccount>;
  authorizeUrl: string;
}

const LOOPBACK_HOST = "127.0.0.1";
const SIGN_IN_TIMED_OUT = "Reflet sign-in timed out. Sign in again.";

async function sendPage(response: ServerResponse, page: Response) {
  response.writeHead(page.status, Object.fromEntries(page.headers));
  response.end(await page.text());
}

async function listenOnLoopback(server: Server): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, LOOPBACK_HOST, resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("The Reflet sign-in listener has no port.");
  }
  return address.port;
}

/** Settles on the first callback carrying this sign-in's state; anything else gets a 404 and changes nothing. */
function awaitConnectCallback(
  server: Server,
  pending: {
    redirectUri: string;
    settings: ResolvedDevtoolsOptions;
    state: string;
  }
): Promise<TeamToolsAccount> {
  const callbackPath = new URL(pending.redirectUri).pathname;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(SIGN_IN_TIMED_OUT)),
      PENDING_CONNECT_TTL_MS
    );
    let isRedeeming = false;
    const redeem = async (url: URL, response: ServerResponse) => {
      const outcome = await redeemConnectCode(pending.settings, {
        code: url.searchParams.get("code"),
        redirectUri: pending.redirectUri,
        state: pending.state,
      });
      await sendPage(response, connectOutcomePage(outcome, "desktopApp"));
      if (!outcome.ok) {
        throw new Error(outcome.message);
      }
      return { organizationName: outcome.organizationName };
    };
    server.on("request", (request, response) => {
      const url = new URL(request.url ?? "/", pending.redirectUri);
      const isThisSignIn =
        request.method === "GET" &&
        url.pathname === callbackPath &&
        url.searchParams.get("state") === pending.state;
      if (isRedeeming || !isThisSignIn) {
        sendPage(
          response,
          htmlPage("Not found", "Nothing here answers this link.", 404)
        ).catch(() => undefined);
        return;
      }
      isRedeeming = true;
      clearTimeout(timeout);
      redeem(url, response).then(resolve, reject);
    });
  });
}

async function startBrowserSignIn(
  settings: ResolvedDevtoolsOptions,
  publicKey: string
): Promise<BrowserSignIn> {
  const server = createServer();
  const port = await listenOnLoopback(server);
  const redirectUri = connectCallbackUriFor(`http://${LOOPBACK_HOST}:${port}`);
  const { authorizeUrl, state } = connectAuthorizeUrl(settings, {
    client: "desktopApp",
    publicKey,
    redirectUri,
  });
  const account = awaitConnectCallback(server, {
    redirectUri,
    settings,
    state,
  }).finally(() => server.close());
  return { account, authorizeUrl };
}

/**
 * Runs team tools for a desktop app in its privileged process (Electron's
 * main): sign-in goes through the system browser back to a one-shot loopback
 * listener, and the token stays on disk outside the page, like the dev
 * server's Connect. Expose the returned bridge to the page over IPC and pass it
 * to `<RefletFeedback teamTools={bridge} />`.
 */
export function createTeamToolsHost(
  options: TeamToolsHostOptions
): TeamToolsBridge {
  const settings = resolveDevtoolsOptions(
    {
      apiUrl: options.apiUrl,
      appUrl: options.appUrl,
      root: options.appDataDirectory,
    },
    {}
  );
  let pendingSignIn: Promise<BrowserSignIn> | null = null;

  const currentSignIn = (): Promise<BrowserSignIn> => {
    if (pendingSignIn) {
      return pendingSignIn;
    }
    const started = startBrowserSignIn(settings, options.publicKey);
    pendingSignIn = started;
    const release = () => {
      if (pendingSignIn === started) {
        pendingSignIn = null;
      }
    };
    started.then((signIn) => signIn.account).then(release, release);
    return started;
  };

  return {
    account: async () => {
      const connection = await readConnection(settings.root, settings.apiUrl);
      return connection && { organizationName: connection.organizationName };
    },
    request: async (call) => {
      const search = call.query ? `?${new URLSearchParams(call.query)}` : "";
      const response = await proxyWithBoardCredential(
        new Request(`${settings.apiUrl}/${search}`, {
          body: call.method === "POST" ? call.body : undefined,
          method: call.method,
        }),
        call.path,
        settings
      );
      return { body: await response.text(), status: response.status };
    },
    signIn: async () => {
      const signIn = await currentSignIn();
      await options.openExternal(signIn.authorizeUrl);
      return await signIn.account;
    },
    signOut: async () => {
      await forgetConnection(settings);
    },
  };
}
