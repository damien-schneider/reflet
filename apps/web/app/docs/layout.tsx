import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { generatePageMetadata } from "@/lib/seo-config";
import { DocsSidebarWrapper } from "./docs-sidebar-wrapper";

export const metadata: Metadata = generatePageMetadata({
  title: "Documentation",
  description:
    "Complete documentation for Reflet SDK, widgets, and component library.",
  path: "/docs",
  keywords: ["documentation", "sdk", "components", "api reference"],
});

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            className="flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
            href="/"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Reflet</span>
          </Link>
          <div className="h-4 w-px bg-border" />
          <Link
            className="font-semibold text-sm transition-colors hover:text-foreground"
            href="/docs"
          >
            Reflet Docs
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl px-4 sm:px-6 lg:px-8">
        <aside className="sticky top-14 hidden h-[calc(100svh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r py-8 pr-6 md:block">
          <DocsSidebarWrapper />
        </aside>

        <main className="min-w-0 flex-1 py-8 md:pl-8">{children}</main>
      </div>
    </div>
  );
}
