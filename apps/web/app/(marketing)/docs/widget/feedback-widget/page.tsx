import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ctrl-ui/react/ui/table";
import type { Metadata } from "next";
import Link from "next/link";

import { InlineCode } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Add a floating feedback button to your website for collecting feature requests and bug reports.",
  path: "/docs/widget/feedback-widget",
  title: "Feedback Widget",
});

export default function FeedbackWidgetPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-foreground leading-snug tracking-tight">
        Feedback Widget
      </h1>
      <p className="mb-8 text-base text-muted-foreground sm:text-xl">
        A floating button that opens a feedback form overlay. Supports feature
        requests, bug reports, and general feedback categories.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-foreground leading-snug tracking-tight">
          Script tag embed
        </h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Add this script tag to your HTML to load the feedback widget:
        </p>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <pre className="overflow-x-auto text-sm">
            {`<script
  src="https://www.reflet.app/widget/feedback.js"
  data-key="fb_pub_xxx"
  data-position="bottom-right"
  async
></script>`}
          </pre>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-foreground leading-snug tracking-tight">
          React component
        </h2>
        <p className="mb-4 text-muted-foreground text-sm">
          For React projects, use the SDK&apos;s FeedbackButton component:
        </p>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <pre className="overflow-x-auto text-sm">
            {`import { RefletProvider, FeedbackButton } from "reflet-sdk/react";

function App() {
  return (
    <RefletProvider publicKey="fb_pub_xxx">
      <FeedbackButton position="bottom-right" />
    </RefletProvider>
  );
}`}
          </pre>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-foreground leading-snug tracking-tight">
          Configuration
        </h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Attribute / Prop</TableHead>
                <TableHead className="text-xs">Values</TableHead>
                <TableHead className="text-xs">Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <InlineCode>data-key / publicKey</InlineCode>
                </TableCell>
                <TableCell className="text-xs">string</TableCell>
                <TableCell className="whitespace-normal text-muted-foreground text-xs">
                  Your organization&apos;s public API key. Required.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <InlineCode>data-position / position</InlineCode>
                </TableCell>
                <TableCell className="text-xs">
                  bottom-right, bottom-left
                </TableCell>
                <TableCell className="whitespace-normal text-muted-foreground text-xs">
                  Where the floating button appears. Default: bottom-right.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <InlineCode>data-theme / theme</InlineCode>
                </TableCell>
                <TableCell className="text-xs">light, dark, auto</TableCell>
                <TableCell className="whitespace-normal text-muted-foreground text-xs">
                  Widget color scheme. Default: auto (matches system).
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl text-foreground leading-snug tracking-tight">
          User identification
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          To associate feedback with authenticated users, pass user data via the
          SDK or data attributes. See the{" "}
          <Link
            className="font-medium text-foreground underline underline-offset-4"
            href="/docs/sdk/installation"
          >
            SDK installation guide
          </Link>{" "}
          for SSO user signing.
        </p>
      </section>
    </div>
  );
}
