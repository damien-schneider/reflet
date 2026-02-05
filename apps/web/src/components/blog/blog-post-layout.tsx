import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { H1, Lead, Muted, Text } from "@/components/ui/typography";
import type { BlogPostMeta } from "@/lib/blog";
import { formatDate, getCategoryLabel } from "@/lib/blog";

interface BlogPostLayoutProps {
  meta: BlogPostMeta;
  children: React.ReactNode;
}

export function BlogPostLayout({ meta, children }: BlogPostLayoutProps) {
  return (
    <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-10">
        <div className="mb-4 flex items-center gap-3">
          <Badge variant="secondary">{getCategoryLabel(meta.category)}</Badge>
          <Muted>{meta.readingTime}</Muted>
        </div>
        <H1 className="mb-4" variant="page">
          {meta.title}
        </H1>
        <Lead className="mb-6">{meta.description}</Lead>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-olive-600/10 font-bold text-olive-600">
              {meta.author
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <div>
              <Text as="span" className="font-medium">
                {meta.author}
              </Text>
              {meta.authorRole && (
                <Muted as="span" className="ml-1">
                  ({meta.authorRole})
                </Muted>
              )}
              <Muted className="block">{formatDate(meta.date)}</Muted>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="prose prose-olive dark:prose-invert max-w-none">
        {children}
      </div>

      {/* Footer CTA */}
      <footer className="mt-12 rounded-xl border border-border bg-muted/50 p-8 text-center">
        <Text className="mb-4 font-display font-semibold text-2xl">
          Ready to streamline your product feedback?
        </Text>
        <Text className="mb-6 text-muted-foreground">
          Start collecting and organizing feedback with Reflet today.
        </Text>
        <div className="flex justify-center gap-4">
          <Link href="/dashboard">
            <Button size="lg">Start Free Trial</Button>
          </Link>
          <Link href="/pricing">
            <Button size="lg" variant="outline">
              View Pricing
            </Button>
          </Link>
        </div>
      </footer>

      {/* Tags */}
      {meta.tags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {meta.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </article>
  );
}
