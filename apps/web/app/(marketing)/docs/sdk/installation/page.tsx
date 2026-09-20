import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ctrl-ui/react/ui/table";
import type { Metadata } from "next";

import { InlineCode } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description: "Install and configure the Reflet SDK in your application.",
  path: "/docs/sdk/installation",
  title: "SDK Installation",
});

export default function SdkInstallationPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-foreground leading-snug tracking-tight">
        SDK Installation
      </h1>
      <p className="mb-8 text-base text-muted-foreground sm:text-xl">
        Install the Reflet SDK and configure it for your project.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-foreground leading-snug tracking-tight">
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
        <h2 className="mb-3 font-display text-2xl text-foreground leading-snug tracking-tight">
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
        <h2 className="mb-3 font-display text-2xl text-foreground leading-snug tracking-tight">
          Configuration options
        </h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Option</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <InlineCode>publicKey</InlineCode>
                </TableCell>
                <TableCell>
                  <InlineCode>string</InlineCode>
                </TableCell>
                <TableCell className="whitespace-normal text-muted-foreground text-xs">
                  Your organization&apos;s public API key (fb_pub_xxx).
                  Required.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <InlineCode>user</InlineCode>
                </TableCell>
                <TableCell>
                  <InlineCode>RefletUser</InlineCode>
                </TableCell>
                <TableCell className="whitespace-normal text-muted-foreground text-xs">
                  User identification for SSO. Optional.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <InlineCode>userToken</InlineCode>
                </TableCell>
                <TableCell>
                  <InlineCode>string</InlineCode>
                </TableCell>
                <TableCell className="whitespace-normal text-muted-foreground text-xs">
                  Pre-signed user token (alternative to user object). Optional.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <InlineCode>baseUrl</InlineCode>
                </TableCell>
                <TableCell>
                  <InlineCode>string</InlineCode>
                </TableCell>
                <TableCell className="whitespace-normal text-muted-foreground text-xs">
                  API base URL. Defaults to Reflet production API. Optional.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl text-foreground leading-snug tracking-tight">
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
