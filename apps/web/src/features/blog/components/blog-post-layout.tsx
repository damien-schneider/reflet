import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import type { BlogPostMeta } from "@/lib/blog";
import { formatDate, getCategoryLabel } from "@/lib/blog";
import {
  getBlogPostJsonLd,
  getBreadcrumbJsonLd,
  getComparisonJsonLd,
} from "@/lib/seo-json-ld";

interface BlogPostLayoutProps {
  children: React.ReactNode;
  meta: BlogPostMeta;
  slug: string;
}

const COMPARISON_PREFIX = "reflet-vs-";
const HYPHENS = /-/g;

function getPostJsonLd(meta: BlogPostMeta, slug: string) {
  if (meta.category === "comparison") {
    return getComparisonJsonLd({
      competitorName: slug.replace(COMPARISON_PREFIX, "").replace(HYPHENS, " "),
      description: meta.description,
      slug,
      title: meta.title,
    });
  }
  return getBlogPostJsonLd({
    author: meta.author,
    datePublished: meta.date,
    description: meta.description,
    ogImage: meta.ogImage,
    slug,
    tags: meta.tags,
    title: meta.title,
  });
}

export function BlogPostLayout({ meta, slug, children }: BlogPostLayoutProps) {
  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: meta.title, path: `/blog/${slug}` },
  ]);

  return (
    <article className="marketing-section pt-12 md:pt-20">
      <JsonLd data={getPostJsonLd(meta, slug)} />
      <JsonLd data={breadcrumbJsonLd} />

      <div className="mx-auto max-w-prose">
        <header className="mb-12 border-(--marketing-hairline) border-b pb-10">
          <nav aria-label="Breadcrumb" className="marketing-kicker">
            <Link className="marketing-text-link" href="/blog">
              Blog
            </Link>
            <span aria-hidden="true"> / </span>
            <span>{getCategoryLabel(meta.category)}</span>
          </nav>
          <h1 className="text-balance text-display md:text-[2.75rem]">
            {meta.title}
          </h1>
          <p className="mt-5 text-pretty text-body-lg text-muted-foreground leading-relaxed">
            {meta.description}
          </p>
          <p className="mt-6 flex flex-wrap gap-x-2 text-body text-muted-foreground">
            <span>
              <span className="text-foreground">{meta.author}</span>
              {meta.authorRole ? `, ${meta.authorRole}` : null}
            </span>
            <span aria-hidden="true">·</span>
            <time className="tabular-nums" dateTime={meta.date}>
              {formatDate(meta.date)}
            </time>
            <span aria-hidden="true">·</span>
            <span>{meta.readingTime}</span>
          </p>
        </header>

        <div>{children}</div>

        {meta.tags.length > 0 ? (
          <footer className="mt-14 border-(--marketing-hairline) border-t pt-8">
            <h2 className="sr-only">Tags</h2>
            <ul className="flex flex-wrap gap-2">
              {meta.tags.map((tag) => (
                <li className="marketing-status" key={tag}>
                  {tag}
                </li>
              ))}
            </ul>
          </footer>
        ) : null}
      </div>
    </article>
  );
}
