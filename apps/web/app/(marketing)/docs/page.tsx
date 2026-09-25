import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  description:
    "Complete developer documentation for Reflet. Explore the SDK, React hooks, embeddable widgets, REST API, and component library to integrate user feedback.",
  title: { absolute: "Documentation | Reflet" },
};

const sections = [
  {
    description: "Integrate feedback collection with hooks and API",
    href: "/docs/sdk",
    title: "SDK",
  },
  {
    description: "Drop-in feedback and changelog widgets",
    href: "/docs/widget",
    title: "Widgets",
  },
  {
    description: "Full CRUD API for feedback, votes, comments, and more",
    href: "/docs/api",
    title: "REST API",
  },
  {
    description: "Pre-made UI components via shadcn registry",
    href: "/docs/components",
    title: "Component Library",
  },
  {
    description:
      "Let coding agents read, claim and close feedback from a shell",
    href: "/docs/cli",
    title: "CLI for agents",
  },
] as const;

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-foreground leading-snug tracking-tight">
        Reflet Documentation
      </h1>
      <p className="mb-8 text-base text-muted-foreground sm:text-xl">
        Everything you need to integrate Reflet into your product. Explore the
        SDK, widgets, and component library.
      </p>

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
