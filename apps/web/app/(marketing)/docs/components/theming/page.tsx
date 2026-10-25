import { MarkdownInlineCode } from "@ctrl-ui/react/ui/markdown-elements";
import type { Metadata } from "next";
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
    "How Reflet UI components adapt to your theme using CSS variables.",
  path: "/docs/components/theming",
  title: "Component theming",
});

const SECTIONS = [
  { id: "how-it-works", label: "How it works" },
  { id: "variables", label: "CSS variables used" },
  { id: "customizing", label: "Customizing components" },
  { id: "dark-mode", label: "Dark mode" },
] as const;

const CSS_VARIABLES = [
  ["--background", "Page background"],
  ["--foreground", "Primary text"],
  ["--card", "Card background"],
  ["--primary", "Active upvote state and accents"],
  ["--secondary", "Track and summary surfaces in milestone views"],
  ["--muted", "Subtle backgrounds and progress tracks"],
  ["--muted-foreground", "Secondary text and metadata"],
  ["--border", "Card borders and dividers"],
  ["--destructive", "Active downvote state"],
  ["--tag-<color>, --tag-<color>-text", "Tag and status pill colors"],
] as const;

export default function ThemingPage() {
  return (
    <DocsPage
      description="Reflet UI components are styled with shadcn CSS variables, so they match your existing theme."
      sections={SECTIONS}
      title="Theming"
    >
      <DocsSection id="how-it-works" sections={SECTIONS}>
        <DocsText>
          Components use Tailwind classes like{" "}
          <MarkdownInlineCode>bg-card</MarkdownInlineCode>,{" "}
          <MarkdownInlineCode>text-foreground</MarkdownInlineCode> and{" "}
          <MarkdownInlineCode>border-border</MarkdownInlineCode>, which resolve
          to the CSS variables in your{" "}
          <MarkdownInlineCode>globals.css</MarkdownInlineCode>. Switch your
          shadcn theme, say from Zinc to Slate, and the components follow.
        </DocsText>
        <DocsText>
          Tag colors come from <MarkdownInlineCode>--tag-*</MarkdownInlineCode>{" "}
          variables that the shadcn CLI adds to your CSS when you install a
          component. Edit them there to retune the palette.
        </DocsText>
      </DocsSection>

      <DocsSection id="variables" sections={SECTIONS}>
        <ReferenceTable
          columns={[
            { kind: "name", label: "Variable" },
            { kind: "text", label: "Used for" },
          ]}
          rows={CSS_VARIABLES.map(([name, usage]) => ({
            cells: [name, usage],
            key: name,
          }))}
        />
      </DocsSection>

      <DocsSection id="customizing" sections={SECTIONS}>
        <DocsText>
          Components are installed as source files in your project, so you can
          edit them directly. Common changes:
        </DocsText>
        <DocsList>
          <li>
            Change the corner radius by adjusting the{" "}
            <MarkdownInlineCode>rounded-*</MarkdownInlineCode> classes.
          </li>
          <li>Adjust padding and gaps.</li>
          <li>
            Tune vote animations through the{" "}
            <MarkdownInlineCode>transition</MarkdownInlineCode> props on the{" "}
            <MarkdownInlineCode>motion</MarkdownInlineCode> elements.
          </li>
          <li>Add or remove fields such as tags, author or description.</li>
        </DocsList>
      </DocsSection>

      <DocsSection id="dark-mode" sections={SECTIONS}>
        <DocsText>
          Dark mode works without extra setup. Every color comes from your
          theme’s CSS variables, including the{" "}
          <MarkdownInlineCode>--tag-*</MarkdownInlineCode> set, which ships with
          light and dark values.
        </DocsText>
      </DocsSection>
    </DocsPage>
  );
}
