import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Documentation - Reflet",
  description:
    "Everything you need to integrate Reflet into your product. Explore the SDK, widgets, and component library.",
};

const sections = [
  {
    title: "SDK",
    description: "Integrate feedback collection with hooks and API",
    href: "/docs/sdk",
  },
  {
    title: "Widgets",
    description: "Drop-in feedback and changelog widgets",
    href: "/docs/widget",
  },
  {
    title: "Component Library",
    description: "Pre-made UI components via shadcn registry",
    href: "/docs/components",
  },
] as const;

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-4xl py-12">
      <div className="mb-10">
        <h1 className="font-display text-4xl text-olive-950 leading-tight tracking-tight sm:text-5xl dark:text-olive-100">
          Reflet Documentation
        </h1>
        <p className="mt-2 text-base text-muted-foreground sm:text-xl">
          Everything you need to integrate Reflet into your product. Explore the
          SDK, widgets, and component library.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link
            className="group rounded-xl border bg-card p-6 transition-colors hover:border-foreground/20 hover:bg-accent/50"
            href={section.href}
            key={section.href}
          >
            <h2 className="font-semibold text-lg">{section.title}</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              {section.description}
            </p>
            <div className="mt-4 flex items-center gap-1 font-medium text-muted-foreground text-sm transition-colors group-hover:text-foreground">
              <span>Get started</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
