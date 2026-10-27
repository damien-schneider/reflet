import type { Metadata } from "next";
import { CodeBlock } from "@/components/docs/code-block";
import {
  DocsList,
  DocsPage,
  DocsSection,
  DocsText,
} from "@/components/docs/docs-page";
import { ReferenceTable } from "@/components/docs/reference-table";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Configure theme tokens, milestone colors and accessible component states.",
  path: "/docs/components/theming",
  title: "Component theming",
});
const SECTIONS = [
  { id: "variables", label: "Theme tokens" },
  { id: "customizing", label: "Customize installed source" },
  { id: "dark-mode", label: "Dark mode and accessibility" },
] as const;
const TOKENS = [
  ["background, foreground, card", "Page, text and card surfaces."],
  ["primary, primary-foreground", "Upvotes, accents and in-progress segments."],
  ["destructive, destructive-foreground", "Downvote states."],
  [
    "secondary, muted, muted-foreground",
    "Track surfaces, progress tracks and metadata.",
  ],
  [
    "border, ring, accent",
    "Dividers, keyboard focus and active timeline rows.",
  ],
  ["chart-1", "Completed segments in the dashboard timeline."],
  [
    "tag-<color>, tag-<color>-text",
    "Colored status/tag backgrounds and text. Added by the registry with light, dark and Tailwind theme mappings.",
  ],
] as const;
const CSS = `/* Override these existing tokens in your theme stylesheet. */
:root {
  --tag-blue: oklch(0.55 0.12 240);
  --tag-blue-text: oklch(0.38 0.10 240);
}
.dark {
  --tag-blue: oklch(0.72 0.10 240);
  --tag-blue-text: oklch(0.85 0.07 240);
}`;

export default function ThemingPage() {
  return (
    <DocsPage
      description="Registry components use your app's Tailwind theme. Unlike embedded widgets, they render in your document and can inherit or override its styles."
      sections={SECTIONS}
      title="Theming"
    >
      <DocsSection id="variables" sections={SECTIONS}>
        <ReferenceTable
          columns={[
            { kind: "name", label: "Token name (CSS variables use --)" },
            { kind: "text", label: "Use" },
          ]}
          rows={TOKENS.map(([name, usage]) => ({
            cells: [name, usage],
            key: name,
          }))}
        />
        <DocsText>
          Color keys are blue, brown, green, orange, pink, purple, red, yellow,
          gray and default. Gray/default use neutral muted tokens. Milestone
          colorHex is separate from these tokens: pass a six-digit hex value
          such as #0b6e99, because the views append alpha suffixes to it.
        </DocsText>
        <CodeBlock code={CSS} />
      </DocsSection>
      <DocsSection id="customizing" sections={SECTIONS}>
        <DocsText>
          Use className on components that expose it for spacing, width or
          typography. Vote controls without a props interface cannot receive
          arbitrary classes or HTML attributes. Edit the installed source when
          you need to change their labels, disable voting, alter headings or
          support additional DOM props.
        </DocsText>
        <DocsText>
          Tag/status color keys are not arbitrary CSS colors. Use the predefined
          keys or extend the installed color map. Milestone targetDate and
          horizon labels are display strings; format them before passing data.
        </DocsText>
      </DocsSection>
      <DocsSection id="dark-mode" sections={SECTIONS}>
        <DocsList>
          <li>
            Apply your app's existing dark theme. The registry supplies tag
            token values, not a theme toggle or detection hook.
          </li>
          <li>
            Check text, status colors, milestone hex colors and focus rings
            against both light and dark surfaces. A color prop does not
            guarantee contrast.
          </li>
          <li>
            Motion components use the user's reduced-motion preference; track
            and expansion transitions include motion-reduce classes. Preserve
            those paths when editing animations.
          </li>
          <li>
            Vote buttons include accessible names and pressed states. Keep these
            when changing icons. Do not wrap a card containing vote buttons
            inside another button.
          </li>
        </DocsList>
      </DocsSection>
    </DocsPage>
  );
}
