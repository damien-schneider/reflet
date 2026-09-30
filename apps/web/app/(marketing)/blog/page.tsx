import Link from "next/link";
import { MarketingPageIntro } from "@/features/homepage/components/marketing-subpage";
import { formatDate, getAllBlogPosts, getCategoryLabel } from "@/lib/blog";

export default async function BlogIndexPage() {
  const posts = await getAllBlogPosts();

  return (
    <div className="marketing-section pt-16 md:pt-24">
      <MarketingPageIntro
        align="start"
        kicker="Blog"
        title="Notes on listening to users"
      >
        Guides and comparisons on collecting feedback, planning roadmaps, and
        telling users what shipped.
      </MarketingPageIntro>

      {posts.length === 0 ? (
        <p className="border-(--marketing-hairline) border-t py-16 text-body-lg text-muted-foreground">
          No posts yet.
        </p>
      ) : (
        <ol className="divide-y divide-(--marketing-hairline) border-(--marketing-hairline) border-t">
          {posts.map((post) => (
            <li key={post.slug}>
              <article className="group relative grid gap-3 py-8 md:grid-cols-[12rem_1fr] md:gap-12">
                <p className="flex flex-wrap gap-x-2 text-body text-muted-foreground md:flex-col md:gap-1">
                  <time className="tabular-nums" dateTime={post.meta.date}>
                    {formatDate(post.meta.date)}
                  </time>
                  <span aria-hidden="true" className="md:hidden">
                    ·
                  </span>
                  <span>
                    {getCategoryLabel(post.meta.category)} ·{" "}
                    {post.meta.readingTime}
                  </span>
                </p>
                <div className="max-w-[65ch]">
                  <h2 className="text-balance text-heading-2 tracking-[-0.02em]">
                    <Link
                      className="after:absolute after:inset-0 group-hover:underline group-hover:decoration-from-font group-hover:underline-offset-4"
                      href={`/blog/${post.slug}`}
                    >
                      {post.meta.title}
                    </Link>
                  </h2>
                  <p className="mt-2 line-clamp-2 text-pretty text-body-lg text-muted-foreground leading-relaxed">
                    {post.meta.description}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
