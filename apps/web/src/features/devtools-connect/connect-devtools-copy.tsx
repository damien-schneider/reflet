import type { ReactNode } from "react";

export type ConnectClient = "desktopApp" | "devServer";

interface ConsentTarget {
  organizationName: string;
  serverOrigin: string;
}

interface ConnectCopy {
  approveFailed: string;
  approveLabel: string;
  approvingLabel: string;
  consent: (target: ConsentTarget) => ReactNode;
  invalidLink: string;
  redirecting: string;
  signIn: string;
  title: string;
  unknownKey: string;
}

export const DESKTOP_APP_CLIENT_PARAM = "desktop";

export const CONNECT_COPY: Record<ConnectClient, ConnectCopy> = {
  desktopApp: {
    approveFailed: "Could not sign the app in. Try again.",
    approveLabel: "Sign in",
    approvingLabel: "Signing in…",
    consent: ({ organizationName }) => (
      <>
        The desktop app will record sessions and read and add internal feedback
        on <strong>{organizationName}</strong>’s board as you. Only continue if
        you just clicked Sign in with Reflet in that app.
      </>
    ),
    invalidLink: "This sign-in link is invalid. Sign in again from the app.",
    redirecting: "Returning to the app…",
    signIn: "Sign in to Reflet to continue in the desktop app.",
    title: "Sign in to a desktop app",
    unknownKey:
      "This app’s widget key isn’t active on Reflet. Ask whoever set up Reflet in the app to check its key.",
  },
  devServer: {
    approveFailed: "Could not connect your dev server. Try again.",
    approveLabel: "Connect",
    approvingLabel: "Connecting…",
    consent: ({ organizationName, serverOrigin }) => (
      <>
        Reflet devtools on <strong>{serverOrigin}</strong> will read and add
        internal feedback on <strong>{organizationName}</strong>’s board as you.
        Only continue if you just clicked Connect in your own dev server.
      </>
    ),
    invalidLink:
      "This connect link is invalid. Start again from the devtools panel.",
    redirecting: "Redirecting to your dev server…",
    signIn: "Sign in to connect your dev server.",
    title: "Connect your dev server",
    unknownKey:
      "This widget key isn’t active on Reflet. Copy the key again from your widget settings, then restart the connection from the devtools panel.",
  },
};
