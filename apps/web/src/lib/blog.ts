import fs from "node:fs";
import path from "node:path";

export interface BlogPostMeta {
  title: string;
  description: string;
  date: string;
  author: string;
  authorRole?: string;
  category:
    | "guide"
    | "tutorial"
    | "case-study"
    | "comparison"
    | "best-practices";
  tags: string[];
  readingTime: string;
  featured?: boolean;
  seoKeywords?: string[];
  ogImage?: string;
}

export interface BlogPost {
  slug: string;
  meta: BlogPostMeta;
}

const BLOG_DIR = path.join(process.cwd(), "app/blog/(posts)");

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  if (!fs.existsSync(BLOG_DIR)) {
    return [];
  }

  const slugs = fs
    .readdirSync(BLOG_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  const posts: BlogPost[] = [];

  for (const slug of slugs) {
    const meta = await getBlogPostMeta(slug);
    if (meta) {
      posts.push({ slug, meta });
    }
  }

  return posts.sort(
    (a, b) => new Date(b.meta.date).getTime() - new Date(a.meta.date).getTime()
  );
}

export async function getBlogPostMeta(
  slug: string
): Promise<BlogPostMeta | null> {
  try {
    const { meta } = await import(`@app/blog/(posts)/${slug}/page.mdx`);
    return meta as BlogPostMeta;
  } catch {
    return null;
  }
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getCategoryLabel(category: BlogPostMeta["category"]): string {
  const labels: Record<BlogPostMeta["category"], string> = {
    guide: "Guide",
    tutorial: "Tutorial",
    "case-study": "Case Study",
    comparison: "Comparison",
    "best-practices": "Best Practices",
  };
  return labels[category];
}
