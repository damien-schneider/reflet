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
    "Create and embed a live chat, configure its launcher, and understand visitor identity and storage.",
  path: "/docs/widget/live-chat",
  title: "Live chat",
});
const SECTIONS = [
  { id: "embed", label: "Create and embed" },
  { id: "settings", label: "Configure the chat" },
  { id: "identity", label: "Identity and privacy" },
  { id: "limits", label: "Errors and limits" },
] as const;
const EMBED = `<script src="https://www.reflet.app/widget/reflet-widget.v1.js" data-widget-id="YOUR_WIDGET_ID"></script>`;
const OPTIONS = [
  [
    "Primary color",
    "Header and launcher accent. Defaults to the organization's color.",
  ],
  ["Position", "Bottom right (default) or bottom left."],
  [
    "Welcome message / subtitle",
    "Header text and optional greeting beneath it. Set your own response expectations.",
  ],
  [
    "Show launcher",
    "On by default. Keep on unless Open automatically is enabled; there is no documented custom-trigger API.",
  ],
  [
    "Open automatically",
    "Off by default. Opens the panel when the page initializes.",
  ],
  [
    "Z-index",
    "Default 9999. Raise it if the launcher is behind another surface.",
  ],
] as const;

export default function LiveChatPage() {
  return (
    <DocsPage
      description="A script-based conversation with your support team. Live chat uses a widget id, not the public API key used by feedback and changelog widgets."
      sections={SECTIONS}
      title="Live chat"
    >
      <DocsSection id="embed" sections={SECTIONS}>
        <DocsList>
          <li>
            As an organization owner or admin, open In-app in the dashboard and
            choose Add live chat.
          </li>
          <li>Name the chat, create it, then copy Embed code from its card.</li>
          <li>
            Add the script once near the end of your site's body. Replace
            YOUR_WIDGET_ID below with the id in the copied code.
          </li>
        </DocsList>
        <CodeBlock code={EMBED} />
        <DocsText>
          The launcher appears after the active widget's settings load. A
          visitor can send the first message without an account or email. Reply
          from the organization's support inbox. After the first message, the
          visitor can request email replies; a confirmation may be required
          before delivery.
        </DocsText>
      </DocsSection>
      <DocsSection id="settings" sections={SECTIONS}>
        <DocsText>
          Open Settings from the chat card. Appearance and behavior are stored
          in Reflet, not script attributes. Reload the host page to load changed
          settings.
        </DocsText>
        <ReferenceTable
          columns={[
            { kind: "name", label: "Dashboard setting" },
            { kind: "text", label: "Behavior" },
          ]}
          rows={OPTIONS.map(([name, description]) => ({
            cells: [name, description],
            key: name,
          }))}
        />
        <DocsText>
          Deactivate the chat to stop public config and visitor operations.
          Deleting it removes settings and visitor links, but leaves support
          conversation records. Remove the embed when retiring the integration.
        </DocsText>
      </DocsSection>
      <DocsSection id="identity" sections={SECTIONS}>
        <DocsList>
          <li>
            The browser stores a random visitor id in localStorage under
            reflet_visitor_id. That id and the widget id identify the
            conversation; this is not an authenticated product-user session.
          </li>
          <li>
            Visitors using the same browser origin and storage share this
            identity. Clearing storage or switching browser/device loses access
            to that browser's thread. Protect the visitor id like conversation
            access data.
          </li>
          <li>
            The widget sends message text, optional email, full page URL,
            document referrer and browser user agent. Keep credentials and
            sensitive data out of page URLs.
          </li>
          <li>
            The embed does not use SDK userToken signing or feedback-key Allowed
            domains. An entered email is not verified customer identity.
          </li>
          <li>
            Requests go to the backend URL compiled into the hosted script. Your
            Content Security Policy must allow the script host and that
            backend's fetch connections. The panel uses a closed shadow root, so
            host CSS cannot style its internals.
          </li>
        </DocsList>
      </DocsSection>
      <DocsSection id="limits" sections={SECTIONS}>
        <DocsList>
          <li>
            Messages are limited to 10,000 characters. The backend rate-limits
            sends, new conversations and email changes. A failed send restores
            the draft and displays an error so the visitor can retry.
          </li>
          <li>
            Existing conversations poll every five seconds: messages while open,
            unread counts while closed.
          </li>
          <li>
            The composer sends text only; it can display supported attachments
            received in the conversation. Enter sends, Shift+Enter inserts a
            newline.
          </li>
          <li>
            Storage access is required during initialization. If the widget does
            not appear, check that it is active, the id matches, localStorage is
            available and script/network requests are allowed. Initial
            configuration failures do not show an in-page error.
          </li>
          <li>
            For teardown, window.__refletWidgetInstance.destroy() stops polling
            and removes the panel. Open/close commands and callbacks are not
            exposed.
          </li>
          <li>
            Controls are labeled, but the panel lacks focus trapping, automatic
            focus on open and Escape dismissal. Provide another support contact
            route for visitors who cannot use it.
          </li>
        </DocsList>
        <DocsText>
          For the support inbox workflow, see{" "}
          <DocsLink href="/docs/using-reflet">using Reflet</DocsLink>. To
          collect structured reports rather than conversations, use{" "}
          <DocsLink href="/docs/widget/floating-feedback">
            floating feedback
          </DocsLink>
          .
        </DocsText>
      </DocsSection>
    </DocsPage>
  );
}
