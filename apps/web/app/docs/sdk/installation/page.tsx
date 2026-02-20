import type { Metadata } from "next";

import { InlineCode } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  title: "SDK Installation",
  description: "Install and configure the Reflet SDK in your application.",
  path: "/docs/sdk/installation",
});

export default function SdkInstallationPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
        SDK Installation
      </h1>
      <p className="mb-8 text-base text-muted-foreground sm:text-xl">
        Install the Reflet SDK and configure it for your project.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Install
        </h2>
        <div className="space-y-2">
          <div className="rounded-lg bg-muted px-4 py-3">
            <code className="text-muted-foreground text-sm">
              npm install reflet-sdk
            </code>
          </div>
          <p className="text-muted-foreground text-xs">
            Also works with yarn, pnpm, and bun.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Configuration
        </h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Create a client instance with your public API key:
        </p>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <pre className="overflow-x-auto text-sm">
            {`import { Reflet } from "reflet-sdk";

const reflet = new Reflet({
  publicKey: "fb_pub_xxx", // from your Reflet dashboard
  user: {
    id: "user_123",
    email: "user@example.com",
    name: "Jane Doe",
  },
});`}
          </pre>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Configuration options
        </h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border border-b bg-muted/50">
                <th className="px-4 py-2.5 text-left font-semibold text-xs">
                  Option
                </th>
                <th className="px-4 py-2.5 text-left font-semibold text-xs">
                  Type
                </th>
                <th className="px-4 py-2.5 text-left font-semibold text-xs">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-border border-b">
                <td className="px-4 py-2">
                  <InlineCode>publicKey</InlineCode>
                </td>
                <td className="px-4 py-2">
                  <InlineCode>string</InlineCode>
                </td>
                <td className="px-4 py-2 text-muted-foreground text-xs">
                  Your organization&apos;s public API key (fb_pub_xxx).
                  Required.
                </td>
              </tr>
              <tr className="border-border border-b">
                <td className="px-4 py-2">
                  <InlineCode>user</InlineCode>
                </td>
                <td className="px-4 py-2">
                  <InlineCode>RefletUser</InlineCode>
                </td>
                <td className="px-4 py-2 text-muted-foreground text-xs">
                  User identification for SSO. Optional.
                </td>
              </tr>
              <tr className="border-border border-b">
                <td className="px-4 py-2">
                  <InlineCode>userToken</InlineCode>
                </td>
                <td className="px-4 py-2">
                  <InlineCode>string</InlineCode>
                </td>
                <td className="px-4 py-2 text-muted-foreground text-xs">
                  Pre-signed user token (alternative to user object). Optional.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2">
                  <InlineCode>baseUrl</InlineCode>
                </td>
                <td className="px-4 py-2">
                  <InlineCode>string</InlineCode>
                </td>
                <td className="px-4 py-2 text-muted-foreground text-xs">
                  API base URL. Defaults to Reflet production API. Optional.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Server-side user signing
        </h2>
        <p className="mb-4 text-muted-foreground text-sm">
          For secure SSO, sign the user on your server and pass the token to the
          client:
        </p>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <pre className="overflow-x-auto text-sm">
            {`// Server
import { signUser } from "reflet-sdk/server";

const { token } = signUser(
  { id: user.id, email: user.email, name: user.name },
  process.env.REFLET_SECRET_KEY!
);

// Client
const reflet = new Reflet({
  publicKey: "fb_pub_xxx",
  userToken: token, // from your server
});`}
          </pre>
        </div>
      </section>
    </div>
  );
}
