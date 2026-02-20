import type { Metadata } from "next";

import { InlineCode } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  title: "Changelog Widget",
  description:
    "Display recent changelog entries in a popover with unread notification badges.",
  path: "/docs/widget/changelog-widget",
});

export default function ChangelogWidgetPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
        Changelog Widget
      </h1>
      <p className="mb-8 text-base text-muted-foreground sm:text-xl">
        Show recent updates and changelog entries in a popover. Automatically
        tracks unread entries with a notification badge.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Script tag embed
        </h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Add this script tag to render the changelog widget:
        </p>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <pre className="overflow-x-auto text-sm">
            {`<script
  src="https://reflet.app/widget/changelog.js"
  data-key="fb_pub_xxx"
  data-trigger="changelog-button"
  async
></script>

<button id="changelog-button">What's new</button>`}
          </pre>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          React component
        </h2>
        <p className="mb-4 text-muted-foreground text-sm">
          For React projects, use the SDK&apos;s ChangelogWidget component:
        </p>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <pre className="overflow-x-auto text-sm">
            {`import { RefletProvider, ChangelogWidget } from "reflet-sdk/react";

function App() {
  return (
    <RefletProvider publicKey="fb_pub_xxx">
      <ChangelogWidget>
        <button>What's new</button>
      </ChangelogWidget>
    </RefletProvider>
  );
}`}
          </pre>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Features
        </h2>
        <ul className="list-inside list-disc space-y-2 text-muted-foreground text-sm">
          <li>
            Popover displays recent changelog entries with title, description,
            and date
          </li>
          <li>Unread badge shows count of entries the user hasn&apos;t seen</li>
          <li>Read state is tracked locally and persisted across sessions</li>
          <li>Entries link back to the full changelog page</li>
        </ul>
      </section>

      <section>
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
                  <InlineCode>data-trigger / trigger</InlineCode>
                </td>
                <td className="px-4 py-2 text-xs">string (element ID)</td>
                <td className="px-4 py-2 text-muted-foreground text-xs">
                  ID of the element that opens the popover. Script tag only.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2">
                  <InlineCode>data-limit / limit</InlineCode>
                </td>
                <td className="px-4 py-2 text-xs">number</td>
                <td className="px-4 py-2 text-muted-foreground text-xs">
                  Max entries to display. Default: 10.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
