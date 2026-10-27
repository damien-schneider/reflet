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
import { ReferenceTable } from "@/components/docs/reference-table";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Embed published releases, configure a trigger, and manage local unread state.",
  path: "/docs/widget/changelog-widget",
  title: "Changelog widget",
});

const SECTIONS = [
  { id: "script-tag", label: "Embed published updates" },
  { id: "react", label: "React" },
  { id: "configuration", label: "Configuration" },
  { id: "api", label: "Methods and callbacks" },
  { id: "features", label: "Read state and limits" },
] as const;

const EMBED = `<button type="button" data-reflet-changelog>
  What's new <span data-reflet-changelog-badge></span>
</button>
<script>
  window.RefletChangelog = {
    publicKey: "fb_pub_xxx",
    mode: "trigger",
    theme: "auto"
  };
</script>
<script src="https://www.reflet.app/widget/reflet-changelog.v1.js" async></script>`;

const REACT = `"use client";

import { ChangelogWidget } from "reflet-sdk/react";

export function Updates() {
  return (
    <>
      <button type="button" data-reflet-changelog>
        What's new <span data-reflet-changelog-badge />
      </button>
      <ChangelogWidget publicKey="fb_pub_xxx" mode="trigger" />
    </>
  );
}`;

const OPTIONS = [
  [
    "publicKey / data-public-key",
    "string, required",
    "Organization public key. No user identification or secret key belongs here.",
  ],
  [
    "mode / data-mode",
    '"card" | "popup" | "trigger"',
    "Default card: floating notification opens the panel. Popup needs an API call or auto-open. Trigger binds existing matching elements.",
  ],
  [
    "triggerSelector / data-trigger-selector",
    "CSS selector",
    "Default [data-reflet-changelog]. All matches are bound once during init.",
  ],
  [
    "maxEntries / data-max-entries",
    "number",
    "Default 10; the API caps results at 100.",
  ],
  [
    "position / data-position",
    '"bottom-right" | "bottom-left"',
    "Default bottom-right. Sets the collapsed card's corner, not popup placement.",
  ],
  [
    "theme / data-theme",
    '"light" | "dark" | "auto"',
    "Default light. Auto resolves the system preference at initialization.",
  ],
  ["primaryColor / data-color", "CSS color", "Accent and badge color."],
  [
    "autoOpenForNew / data-auto-open",
    "boolean / string",
    "Default false. Script attribute must equal true. Ignored in trigger mode.",
  ],
] as const;

const METHODS = `// Script loader API, after initialization:
window.Reflet("open_changelog");
window.Reflet("close_changelog");
const unread = window.Reflet("get_unread_changelog_count");
window.Reflet("mark_changelog_read");

// The script-created instance also exposes:
const widget = window.__refletChangelogWidgetInstance;
widget.toggle();
widget.getUnreadCount();
widget.markAsRead();
widget.destroy();`;

export default function ChangelogWidgetPage() {
  return (
    <DocsPage
      description="Show published releases in a floating card or a panel opened from your own button. Unread state belongs to this browser, not a signed-in user."
      sections={SECTIONS}
      title="Changelog widget"
    >
      <DocsSection id="script-tag" sections={SECTIONS}>
        <DocsText>
          Publish a release in a public organization and create an organization
          API key. Replace fb_pub_xxx below. Put the config before the loader
          and render trigger buttons before initialization.
        </DocsText>
        <CodeBlock code={EMBED} />
        <DocsText>
          Use a real button for keyboard access. The badge is optional. If
          feedback is also embedded, initialize it before loading changelog;
          this loader replaces window.Reflet with its command function.
        </DocsText>
      </DocsSection>
      <DocsSection id="react" sections={SECTIONS}>
        <InstallCommand command="npm install reflet-sdk" />
        <CodeBlock code={REACT} />
        <DocsText>
          ChangelogWidget requires its own publicKey, even inside
          RefletProvider. It loads the changelog script and creates an instance;
          do not also add a configured script embed. Keep one mounted instance
          and stable callback props. Its instance is not exposed through a React
          ref or the script loader's global instance.
        </DocsText>
      </DocsSection>
      <DocsSection id="configuration" sections={SECTIONS}>
        <ReferenceTable
          columns={[
            { kind: "name", label: "Config / script attribute" },
            { kind: "code", label: "Value" },
            { kind: "text", label: "Behavior" },
          ]}
          rows={OPTIONS.map(([name, type, description]) => ({
            cells: [name, type, description],
            key: name,
          }))}
        />
        <DocsText>
          Global config takes precedence over script attributes. Use it for
          predictable initialization when the document is still loading. The
          React wrapper accepts the config names as props. locale exists in the
          type but does not translate the widget's current labels.
        </DocsText>
      </DocsSection>
      <DocsSection id="api" sections={SECTIONS}>
        <CodeBlock code={METHODS} />
        <DocsText>
          Global config and React props accept onOpen(), onClose() and
          onEntryClick(entry). An entry contains id, title, optional
          description/version/publishedAt, and items (linked feedback id/title
          pairs). Entry callbacks do not navigate automatically and are
          currently attached to click events, not keyboard actions. Do not use
          them as the only route to essential content.
        </DocsText>
      </DocsSection>
      <DocsSection id="features" sections={SECTIONS}>
        <DocsList>
          <li>
            Explicitly opening the panel or dismissing the card marks fetched
            entries as read. markAsRead does the same; auto-open does not.
          </li>
          <li>
            localStorage stores the latest seen publication timestamp under
            reflet_changelog_seen_ plus the public key. Counts include only
            fetched entries newer than that timestamp, not your entire release
            history.
          </li>
          <li>
            No user token is sent. Read state is shared by visitors using the
            same browser origin/key and does not sync between devices. When
            storage is blocked, read state lasts only in memory for this
            instance.
          </li>
          <li>
            Render triggers before initialization; later elements are not bound.
            The trigger panel uses a fixed position, not the clicked button's
            position.
          </li>
          <li>
            Explicit open() focuses the close button, Escape closes the panel
            and close restores previous focus. The widget does not implement a
            full focus trap; test keyboard navigation in your host app.
          </li>
          <li>
            Data loads on initialization, not on a polling interval. Failed
            requests appear in the panel with Retry. A private organization
            cannot publish its changelog through a public-key embed.
          </li>
        </DocsList>
        <DocsText>
          See{" "}
          <DocsLink href="/docs/api">API authentication and errors</DocsLink>{" "}
          for origin restrictions. For publishing workflow, read{" "}
          <DocsLink href="/docs/using-reflet">using Reflet</DocsLink>.
        </DocsText>
      </DocsSection>
    </DocsPage>
  );
}
