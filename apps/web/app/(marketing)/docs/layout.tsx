import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { generatePageMetadata } from "@/lib/seo-config";
import { DocsMobileNav, DocsSidebarWrapper } from "./docs-sidebar-wrapper";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Complete documentation for Reflet SDK, widgets, and component library.",
  keywords: ["documentation", "sdk", "components", "api reference"],
  path: "/docs",
  title: "Documentation",
});

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-background">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-body"
        href="#docs-content"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <DocsMobileNav />
          <Link
            className="font-semibold text-body text-foreground"
            href="/docs"
          >
            Reflet Docs
          </Link>
          <Link
            className="ml-auto flex items-center gap-1.5 text-body text-muted-foreground hover:text-foreground"
            href="/"
          >
            <ArrowLeft aria-hidden className="size-4" />
            Back to Reflet
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="sticky top-14 hidden h-[calc(100svh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r py-8 pr-4 md:block">
          <DocsSidebarWrapper />
        </div>

        <main
          className="min-w-0 flex-1 pb-16 outline-none"
          id="docs-content"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
