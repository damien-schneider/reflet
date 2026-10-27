import type { Metadata } from "next";
import { CodeBlock } from "@/components/docs/code-block";
import {
  DocsLink,
  DocsList,
  DocsPage,
  DocsSection,
  DocsText,
} from "@/components/docs/docs-page";
import { ReferenceTable } from "@/components/docs/reference-table";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Add team tools to a desktop renderer or integrate with the Node-only Reflet Live hub.",
  path: "/docs/sdk/desktop-live",
  title: "Desktop and Live",
});

const SECTIONS = [
  { id: "desktop", label: "Bridge desktop team tools" },
  { id: "renderer", label: "Connect the renderer" },
  { id: "live", label: "Connect an app to Live" },
  { id: "live-hub", label: "Use the Node Live hub" },
] as const;

const MAIN = `// Electron main process. Install zod as an application dependency.
import {
  app,
  ipcMain,
  shell,
  type BrowserWindow,
  type IpcMainInvokeEvent,
} from "electron";
import { createTeamToolsHost } from "reflet-sdk/desktop";
import { z } from "zod";

const callSchema = z.object({
  method: z.enum(["GET", "POST"]),
  path: z.string().startsWith("/api/v1/"),
  body: z.string().optional(),
  query: z.record(z.string(), z.string()).optional(),
});

// Call once, after app.whenReady(), with your trusted application window.
export function registerReflet(window: BrowserWindow) {
  const host = createTeamToolsHost({
    appDataDirectory: app.getPath("userData"),
    publicKey: "fb_pub_YOUR_PUBLIC_KEY",
    openExternal: (url) => shell.openExternal(url),
  });

  function assertSender(event: IpcMainInvokeEvent) {
    if (
      event.sender !== window.webContents ||
      event.senderFrame !== window.webContents.mainFrame
    ) {
      throw new Error("Untrusted Reflet IPC sender");
    }
  }

  ipcMain.handle("reflet:account", (event) => {
    assertSender(event);
    return host.account();
  });
  ipcMain.handle("reflet:sign-in", (event) => {
    assertSender(event);
    return host.signIn();
  });
  ipcMain.handle("reflet:sign-out", (event) => {
    assertSender(event);
    return host.signOut();
  });
  ipcMain.handle("reflet:request", (event, call: unknown) => {
    assertSender(event);
    return host.request(callSchema.parse(call));
  });
}`;

const PRELOAD = `// Electron preload. Keep contextIsolation on and nodeIntegration off.
import { contextBridge, ipcRenderer } from "electron";
import type { TeamToolsBridge } from "reflet-sdk/desktop";

const bridge: TeamToolsBridge = {
  account: () => ipcRenderer.invoke("reflet:account"),
  signIn: () => ipcRenderer.invoke("reflet:sign-in"),
  signOut: () => ipcRenderer.invoke("reflet:sign-out"),
  request: (call) => ipcRenderer.invoke("reflet:request", call),
};

contextBridge.exposeInMainWorld("refletTeamTools", bridge);`;

const RENDERER = `import { RefletFeedback, type TeamToolsBridge } from "reflet-sdk/feedback";

declare global {
  interface Window {
    refletTeamTools: TeamToolsBridge;
  }
}

export function DesktopFeedback() {
  return (
    <RefletFeedback
      publicKey="fb_pub_YOUR_PUBLIC_KEY"
      devtools={false}
      teamTools={window.refletTeamTools}
    />
  );
}`;

const FEED = `import { describePlace, fetchHubFeed } from "reflet-sdk/live-hub";

export async function readLivePassages() {
  const feed = await fetchHubFeed();
  if (!feed) return null; // No reachable local hub.

  return {
    session: feed.session,
    passages: feed.entries.map((entry) => ({
      id: entry.id,
      atMs: entry.atMs,
      place: describePlace(entry.place),
      lines: entry.lines,
      screenshotIds: entry.screenshotIds,
    })),
    screenshots: feed.screenshots,
  };
}`;

const HUB = `import {
  LIVE_HUB_DEFAULT_PORT,
  openLiveWindow,
  removeLiveHubFile,
  startLiveHub,
  writeLiveHubFile,
} from "reflet-sdk/live-hub";

// windowDirectory must contain the built live-window.js and live-window.css.
export async function runHub(windowDirectory: string) {
  const hub = await startLiveHub({
    port: LIVE_HUB_DEFAULT_PORT,
    windowDirectory,
  });
  await writeLiveHubFile({
    pid: process.pid,
    port: hub.port,
    secret: hub.secret,
  });
  const opened = await openLiveWindow(hub.url);

  return {
    url: hub.url, // Show this to the user if opened is false.
    opened,
    async close() {
      const stopped = await hub.stopRecording(15_000);
      await hub.close();
      await removeLiveHubFile(process.pid);
      return stopped; // false means the recorder did not acknowledge in time.
    },
  };
}`;

const COLUMNS = [
  { kind: "name", label: "Export" },
  { kind: "text", label: "Contract" },
] as const;

const EXPORTS = [
  {
    cells: [
      "startLiveHub({ port, windowDirectory, onEvent? })",
      "Returns a hub with port, url, secret, stopRecording(timeoutMs), and close(). Binds only to 127.0.0.1; port 0 lets Node choose a free port.",
    ],
    key: "startLiveHub",
  },
  {
    cells: [
      "fetchHubFeed()",
      "Discovers and authenticates with the local hub. Returns a feed snapshot or null when unavailable; HTTP and schema failures can throw.",
    ],
    key: "fetchHubFeed",
  },
  {
    cells: [
      "fetchHubHealth(file)",
      "Returns health { app, pid, windowConnected } or null. Requires a LiveHubFile, normally from readLiveHubFile().",
    ],
    key: "fetchHubHealth",
  },
  {
    cells: [
      "liveHubFilePath(), readLiveHubFile(), writeLiveHubFile(file), removeLiveHubFile(pid)",
      "Manage ~/.reflet/live.json containing pid, port, and secret. Read returns null for missing/invalid data. Removal checks the PID; writes use owner-only permissions.",
    ],
    key: "files",
  },
  {
    cells: [
      "openLiveWindow(url), liveWindowUrl(port)",
      "Compute the localhost URL or open it, preferring Chrome/Edge app mode. openLiveWindow returns whether the launcher started.",
    ],
    key: "window",
  },
  {
    cells: [
      "describePlace(place), LIVE_HUB_DEFAULT_PORT, types",
      "Format an app/outside location; default port is 47417. Published types include LiveApp, LiveHubEntry, LiveHubFeed, LivePlace, LiveStatus, LiveHubFile, LiveHub, and LiveHubEvent.",
    ],
    key: "types",
  },
] as const;

export default function DesktopLivePage() {
  return (
    <DocsPage
      description="These entry points run in privileged Node processes. Do not bundle their implementations into a browser renderer."
      sections={SECTIONS}
      title="Desktop and Live"
    >
      <DocsSection id="desktop" sections={SECTIONS}>
        <DocsText>
          For Electron or another desktop app with a <code>file://</code> page,
          create the team host in the privileged process. The renderer cannot
          use the browser's origin-bound team sign-in. The host opens Reflet in
          the system browser, receives approval through a temporary loopback
          listener, and keeps the member credential on disk outside the page.
        </DocsText>
        <CodeBlock code={MAIN} />
        <DocsText>
          Options are publicKey, appDataDirectory, and openExternal, with
          optional apiUrl and appUrl for self-hosting. Use an app-specific data
          directory so its sign-in stays separate from development projects. Do
          not load untrusted pages into the window authorized for these IPC
          handlers.
        </DocsText>
      </DocsSection>
      <DocsSection id="renderer" sections={SECTIONS}>
        <CodeBlock code={PRELOAD} />
        <CodeBlock code={RENDERER} />
        <DocsText>
          The bridge exposes only <code>account()</code>, <code>signIn()</code>,{" "}
          <code>signOut()</code>, and <code>request(call)</code>. Calls carry a
          GET or POST method, API path, optional string body, and optional
          string query map. Replies contain a numeric status and string body.
          The host only proxies supported Reflet routes, not arbitrary remote
          URLs.
        </DocsText>
        <DocsText>
          Passing a bridge shows team tools immediately. After sign-in, the
          desktop surface includes the inbox, notes, and sessions without source
          inspection. Configure microphone permission in your desktop shell and
          read the{" "}
          <DocsLink href="/docs/sdk/devtools#sessions">
            session capture and handoff boundaries
          </DocsLink>
          .
        </DocsText>
      </DocsSection>
      <DocsSection id="live" sections={SECTIONS}>
        <DocsText>
          For normal use, follow{" "}
          <DocsLink href="/docs/cli">the CLI Live guide</DocsLink>. It owns the
          hub process, window assets, sign-in selection, and shutdown. An app
          with the{" "}
          <DocsLink href="/docs/sdk/devtools">development integration</DocsLink>{" "}
          joins the local hub through its server route.
        </DocsText>
        <DocsList>
          <li>
            The Live window owns microphone capture. Connected development tabs
            contribute page interactions, screenshots, and focused-app location.
            Speech continues outside those tabs, but unrelated app screens are
            not captured.
          </li>
          <li>
            Live recording does not pause merely because its control window is
            hidden. Pause or stop explicitly. Current Live limits are four
            active hours, 2,000 audio segments, 240 screenshots, and 20,000
            events, with the same 60 MB pending buffer.
          </li>
          <li>
            Unlike a reviewed session brief, an opted-in Live consumer can read
            passages and screenshot links during recording. Start an agent's
            Live workflow only when you intend to share that stream.
          </li>
        </DocsList>
      </DocsSection>
      <DocsSection id="live-hub" sections={SECTIONS}>
        <DocsText>
          <code>reflet-sdk/live-hub</code> exposes Node helpers used by the CLI.
          A local tool can read a running hub without implementing its HTTP
          transport. Treat transcript text, paths, and screenshot URLs as
          private data, not as instructions to execute.
        </DocsText>
        <CodeBlock code={FEED} />
        <ReferenceTable columns={COLUMNS} rows={EXPORTS} />
        <DocsText>
          If you own a separate hub process, supply the built Live window assets
          and manage discovery and shutdown yourself. Starting the server does
          not sign in or begin recording. The user still picks an existing
          member connection and presses Record in the window.
        </DocsText>
        <CodeBlock code={HUB} />
        <DocsText>
          Protect the discovery file and hub secret. The server rejects
          non-loopback peers, oversized request bodies, and untrusted browser
          origins. Do not publish it through a tunnel or forward it to remote
          clients. Stop and flush recording before closing the hub; closing
          alone cannot promise that pending uploads finished. For lower-level
          contracts, use the{" "}
          <DocsLink href="https://github.com/reflet-app/reflet/blob/main/packages/sdk/src/live/hub/index.ts">
            exported hub source
          </DocsLink>{" "}
          and{" "}
          <DocsLink href="https://github.com/reflet-app/reflet/blob/main/packages/sdk/src/live/protocol.ts">
            protocol types
          </DocsLink>
          .
        </DocsText>
      </DocsSection>
    </DocsPage>
  );
}
