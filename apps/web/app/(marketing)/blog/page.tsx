import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { H1, H3, Lead, Muted, Text } from "@/components/ui/typography";
import { formatDate, getAllBlogPosts, getCategoryLabel } from "@/lib/blog";

export default async function BlogIndexPage() {
  const posts = await getAllBlogPosts();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <H1 className="mb-4" variant="page">
          Reflet Blog
        </H1>
        <Lead>
          Guides, tutorials, and best practices for product feedback management.
        </Lead>
      </div>

      {posts.length === 0 ? (
        <div className="py-12 text-center">
          <Text className="text-muted-foreground">
            No blog posts yet. Check back soon!
          </Text>
        </div>
      ) : (
        <div className="space-y-8">
          {posts.map((post) => (
            <article
              className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-foreground/20"
              key={post.slug}
            >
              <Link href={`/blog/${post.slug}`}>
                <div className="mb-3 flex items-center gap-3">
                  <Badge variant="secondary">
                    {getCategoryLabel(post.meta.category)}
                  </Badge>
                  <Muted>{post.meta.readingTime}</Muted>
                </div>
                <H3
                  className="mb-2 transition-colors group-hover:text-olive-600"
                  variant="cardBold"
                >
                  {post.meta.title}
                </H3>
                <Text className="mb-4 line-clamp-2 text-muted-foreground">
                  {post.meta.description}
                </Text>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-olive-600/10 font-bold text-olive-600 text-xs">
                    {post.meta.author
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <span className="font-medium text-sm">
                      {post.meta.author}
                    </span>
                    <span className="ml-2 text-muted-foreground text-sm">
                      {formatDate(post.meta.date)}
                    </span>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
