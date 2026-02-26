import type { Metadata } from "next";
import Link from "next/link";

import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  title: "Blog",
  description:
    "Learn about product feedback management, roadmap planning, and building products users love. Guides, tutorials, and best practices from the Reflet team.",
  path: "/blog",
  keywords: [
    "product management blog",
    "feedback management",
    "roadmap planning",
    "product development",
  ],
});

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-border border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            className="text-muted-foreground text-sm transition-colors hover:text-foreground"
            href="/"
          >
            &larr; Back to Reflet
          </Link>
          <Link
            className="font-display font-semibold text-foreground text-lg"
            href="/blog"
          >
            Reflet Blog
          </Link>
          <div className="w-24" />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
