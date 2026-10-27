import type { Metadata } from "next";
import { CodeBlock } from "@/components/docs/code-block";
import {
  DocsLink,
  DocsList,
  DocsPage,
  DocsSection,
  DocsText,
} from "@/components/docs/docs-page";
import { InstallCommand } from "@/components/docs/install-command";
import { PropsTable } from "@/components/docs/props-table";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Install the Reflet SDK, configure API access, and sign trusted user identities.",
  path: "/docs/sdk/installation",
  title: "SDK installation",
});

const SECTIONS = [
  { id: "install", label: "Install" },
  { id: "configuration", label: "Configure a client" },
  { id: "user-signing", label: "Sign a trusted user" },
  { id: "identity-changes", label: "Change or clear identity" },
] as const;

const CONFIG = `import { Reflet } from "reflet-sdk";

const reflet = new Reflet({
  publicKey: "fb_pub_YOUR_PUBLIC_KEY",
});

const config = await reflet.getConfig();`;

const SIGNING = `// Server only. Call after authenticating the request in your own app.
import { signUser } from "reflet-sdk/server";

type AuthenticatedUser = {
  id: string;
  email?: string;
  name?: string;
};

export async function createRefletIdentity(user: AuthenticatedUser) {
  const secretKey = process.env.REFLET_SECRET_KEY;
  if (!secretKey) {
    throw new Error("REFLET_SECRET_KEY is missing");
  }

  return await signUser(
    { id: user.id, email: user.email, name: user.name },
    secretKey,
    3600,
  );
}`;

const CLIENT_IDENTITY = `import { Reflet } from "reflet-sdk";

// Supply the token returned by your authenticated server endpoint.
export function createUserClient(token: string) {
  return new Reflet({
    publicKey: "fb_pub_YOUR_PUBLIC_KEY",
    userToken: token,
  });
}`;

const OPTIONS = [
  {
    description:
      "The fb_pub_ key for your organization. Browser-safe, but not proof of user identity or permission to read private items.",
    name: "publicKey",
    required: true,
    type: "string",
  },
  {
    description:
      "A token signed by your server with the matching secret key. Takes precedence over user.",
    name: "userToken",
    type: "string",
  },
  {
    description:
      "Unverified attribution for feedback creation. Requires id; optionally email, name, avatar, and metadata. Does not authorize votes, comments, or subscriptions.",
    name: "user",
    type: "RefletUser",
  },
  {
    default: "Hosted Reflet API",
    description:
      "API origin for a self-hosted backend, without a trailing slash. Not your public board URL.",
    name: "baseUrl",
    type: "string",
  },
] as const;

export default function SdkInstallationPage() {
  return (
    <DocsPage
      description="Use a public key in the app. Keep signing keys and privileged transports on your server."
      sections={SECTIONS}
      title="SDK installation"
    >
      <DocsSection id="install" sections={SECTIONS}>
        <InstallCommand command="npm install reflet-sdk" />
        <DocsText>
          The core client needs <code>fetch</code>. Server token helpers need
          Web Crypto, available in Node.js 18+ and compatible edge runtimes.
          React entry points require React and React DOM 18 or 19. The Vite
          plugin requires Vite 5+.
        </DocsText>
      </DocsSection>
      <DocsSection id="configuration" sections={SECTIONS}>
        <DocsText>
          Create an API key in your organization's settings. Add your app's
          origin to its allowed domains before using the public key in a
          browser. The client sends it as a Bearer credential on every request.
        </DocsText>
        <CodeBlock code={CONFIG} />
        <PropsTable props={OPTIONS} />
        <DocsText>
          Public keys do not unlock internal feedback. Trusted user tokens
          identify your customers; they do not grant organization membership.
          For private team access, use{" "}
          <DocsLink href="/docs/sdk/devtools#access">team sign-in</DocsLink>.
          For server-side administration, use the{" "}
          <DocsLink href="/docs/api">HTTP API</DocsLink>. Never put a secret key
          in client props, a public environment variable, source control, or a
          browser bundle.
        </DocsText>
      </DocsSection>
      <DocsSection id="user-signing" sections={SECTIONS}>
        <DocsText>
          Voting, commenting, subscribing, and unsubscribing require a verified
          external user. Authenticate the request in your app, derive the user
          ID from that session, then sign it. Do not sign an arbitrary ID
          supplied by the browser.
        </DocsText>
        <CodeBlock code={SIGNING} title="Your server" />
        <CodeBlock code={CLIENT_IDENTITY} title="Your client" />
        <DocsList>
          <li>
            <code>signUser(user, secretKey, expiresInSeconds?)</code> is
            asynchronous and returns <code>{"{ token, expiresAt }"}</code>.
            Expiration defaults to 86,400 seconds; <code>expiresAt</code> is a
            millisecond timestamp.
          </li>
          <li>
            Fetch a replacement from your authenticated server before
            expiration. The SDK does not refresh tokens for you.
          </li>
          <li>
            <code>verifyUser(token, secretKey)</code> is also asynchronous. It
            returns the user fields or <code>null</code> for an invalid or
            expired token. Keep verification server-side.
          </li>
          <li>
            The <code>user</code> option creates an unsigned identity. It can
            attribute a new report, but cannot act as a user established by a
            signed token or update their profile.
          </li>
        </DocsList>
      </DocsSection>
      <DocsSection id="identity-changes" sections={SECTIONS}>
        <CodeBlock
          code={`// After fetching a fresh signed token:
reflet.setUserToken(token);

// On sign-out:
reflet.setUserToken(undefined);

// Unverified attribution for report creation only:
reflet.setUser({ id: "visitor_123", name: "Visitor" });
reflet.setUser(undefined);`}
        />
        <DocsText>
          Each setter clears the other identity mode. In React, pass refreshed
          tokens through <code>RefletProvider</code>; use its context setter for
          unsigned user state. See{" "}
          <DocsLink href="/docs/sdk/react-hooks#provider">
            provider identity
          </DocsLink>
          .
        </DocsText>
      </DocsSection>
    </DocsPage>
  );
}
