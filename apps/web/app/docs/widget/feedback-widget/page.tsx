import type { Metadata } from "next";

import { InlineCode } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  title: "Feedback Widget",
  description:
    "Add a floating feedback button to your website for collecting feature requests and bug reports.",
  path: "/docs/widget/feedback-widget",
});

export default function FeedbackWidgetPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
        Feedback Widget
      </h1>
      <p className="mb-8 text-base text-muted-foreground sm:text-xl">
        A floating button that opens a feedback form overlay. Supports feature
        requests, bug reports, and general feedback categories.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Script tag embed
        </h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Add this script tag to your HTML to load the feedback widget:
        </p>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <pre className="overflow-x-auto text-sm">
            {`<script
  src="https://reflet.app/widget/feedback.js"
  data-key="fb_pub_xxx"
  data-position="bottom-right"
  async
></script>`}
          </pre>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
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
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Configuration
        </h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border border-b bg-muted/50">
                <th className="px-4 py-2.5 text-left font-semibold text-xs">
                  Attribute / Prop
                </th>
                <th className="px-4 py-2.5 text-left font-semibold text-xs">
                  Values
                </th>
                <th className="px-4 py-2.5 text-left font-semibold text-xs">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-border border-b">
                <td className="px-4 py-2">
                  <InlineCode>data-key / publicKey</InlineCode>
                </td>
                <td className="px-4 py-2 text-xs">string</td>
                <td className="px-4 py-2 text-muted-foreground text-xs">
                  Your organization&apos;s public API key. Required.
                </td>
              </tr>
              <tr className="border-border border-b">
                <td className="px-4 py-2">
                  <InlineCode>data-position / position</InlineCode>
                </td>
                <td className="px-4 py-2 text-xs">bottom-right, bottom-left</td>
                <td className="px-4 py-2 text-muted-foreground text-xs">
                  Where the floating button appears. Default: bottom-right.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2">
                  <InlineCode>data-theme / theme</InlineCode>
                </td>
                <td className="px-4 py-2 text-xs">light, dark, auto</td>
                <td className="px-4 py-2 text-muted-foreground text-xs">
                  Widget color scheme. Default: auto (matches system).
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          User identification
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          To associate feedback with authenticated users, pass user data via the
          SDK or data attributes. See the{" "}
          <a
            className="font-medium text-foreground underline underline-offset-4"
            href="/docs/sdk/installation"
          >
            SDK installation guide
          </a>{" "}
          for SSO user signing.
        </p>
      </section>
    </div>
  );
}
