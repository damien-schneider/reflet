import type { Metadata } from "next";

import { InlineCode } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  title: "Component Theming",
  description:
    "How Reflet UI components adapt to your theme using CSS variables.",
  path: "/docs/components/theming",
});

const CSS_VARIABLES = [
  { name: "--background", usage: "Page background" },
  { name: "--foreground", usage: "Primary text color" },
  { name: "--card", usage: "Card background" },
  { name: "--card-foreground", usage: "Card text color" },
  { name: "--primary", usage: "Vote active state, links, accents" },
  { name: "--primary-foreground", usage: "Text on primary backgrounds" },
  { name: "--secondary", usage: "Tag backgrounds" },
  { name: "--secondary-foreground", usage: "Tag text" },
  { name: "--muted", usage: "Subtle backgrounds, code blocks" },
  { name: "--muted-foreground", usage: "Secondary text, metadata" },
  { name: "--border", usage: "Card borders, dividers" },
  { name: "--destructive", usage: "Error states" },
] as const;

export default function ThemingPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
        Theming
      </h1>
      <p className="mb-8 text-base text-muted-foreground sm:text-xl">
        Reflet UI components use shadcn CSS variables exclusively, so they
        automatically match your existing theme.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          How it works
        </h2>
        <p className="mb-4 text-muted-foreground text-sm leading-relaxed">
          Every component uses Tailwind classes like{" "}
          <InlineCode>bg-card</InlineCode>,{" "}
          <InlineCode>text-foreground</InlineCode>, and{" "}
          <InlineCode>border-border</InlineCode> that resolve to CSS custom
          properties defined in your <InlineCode>globals.css</InlineCode>. No
          hardcoded colors are used.
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          This means if you switch your shadcn theme (e.g., from Zinc to Slate,
          or from light to dark mode), the components update automatically.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          CSS variables used
        </h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border border-b bg-muted/50">
                <th className="px-4 py-2.5 text-left font-semibold text-xs">
                  Variable
                </th>
                <th className="px-4 py-2.5 text-left font-semibold text-xs">
                  Used for
                </th>
              </tr>
            </thead>
            <tbody>
              {CSS_VARIABLES.map((v) => (
                <tr
                  className="border-border border-b last:border-0"
                  key={v.name}
                >
                  <td className="px-4 py-2">
                    <InlineCode>{v.name}</InlineCode>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    {v.usage}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Customizing components
        </h2>
        <p className="mb-4 text-muted-foreground text-sm leading-relaxed">
          Since components are installed as source files in your project, you
          can modify them directly. Common customizations:
        </p>
        <ul className="list-inside list-disc space-y-2 text-muted-foreground text-sm">
          <li>
            Change border radius by adjusting{" "}
            <InlineCode>rounded-xl</InlineCode> classes
          </li>
          <li>Adjust spacing with different padding/margin values</li>
          <li>Modify the vote animation timing in the style block</li>
          <li>Add or remove fields (tags, author, description)</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl text-olive-950 leading-snug tracking-tight dark:text-olive-100">
          Dark mode
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Components support dark mode out of the box. Status badges use
          Tailwind&apos;s <InlineCode>dark:</InlineCode> variant for specific
          color adjustments. Everything else inherits from your theme&apos;s CSS
          variables, which should already define dark mode values.
        </p>
      </section>
    </div>
  );
}
