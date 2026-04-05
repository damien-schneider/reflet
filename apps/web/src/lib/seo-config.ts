import type { Metadata, Viewport } from "next";

export const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.reflet.app";
export const SITE_NAME = "Reflet";
const DEFAULT_TITLE =
  "Reflet — The Autonomous AI Company That Runs Your Product";
export const DEFAULT_DESCRIPTION =
  "10 AI agents — CEO, PM, CTO, Dev, Growth, Sales, Security, Architect, Support, Docs — autonomously discover opportunities, build features, ship code, find leads, and handle support. Connect your GitHub repo. Your AI company starts in 5 minutes.";

const DEFAULT_KEYWORDS = [
  "autonomous AI company",
  "AI employees",
  "AI agents",
  "AI workforce",
  "AI digital workers",
  "agentic AI",
  "AI run company",
  "autonomous AI agents",
  "AI company in a box",
  "zero employee company",
  "AI CEO",
  "AI product manager",
  "AI developer",
  "AI sales agent",
  "AI growth agent",
  "AI support agent",
  "AI CTO",
  "autonomous product development",
  "AI team automation",
  "AI SaaS operations",
  "Devin alternative",
  "Artisan alternative",
  "Sintra AI alternative",
  "Relevance AI alternative",
  "Lindy AI alternative",
  "product feedback platform",
  "canny alternative",
  "featurebase alternative",
  "product roadmap tool",
  "open source feedback tool",
];

export const siteConfig = {
  name: SITE_NAME,
  url: BASE_URL,
  description: DEFAULT_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  author: "Reflet Team",
  twitterHandle: "@reflet_app",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

const DEFAULT_OG_IMAGE = "/api/og";

export const defaultMetadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  authors: [{ name: "Reflet Team", url: BASE_URL }],
  creator: "Reflet",
  publisher: "Reflet",
  applicationName: SITE_NAME,
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Reflet — Autonomous AI Company Platform",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
    creator: "@reflet_app",
    site: "@reflet_app",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    types: {
      "application/rss+xml": `${BASE_URL}/feed.xml`,
    },
  },
  verification: {
    // Add your verification codes here when available
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // bing: 'your-bing-verification-code',
  },
  appleWebApp: {
    title: "Reflet",
    statusBarStyle: "default",
  },
  category: "technology",
  classification: "Artificial Intelligence Software",
};

/**
 * Build an OG image URL that generates a branded image on-the-fly.
 */
function buildOgImageUrl(
  title: string,
  description?: string,
  type?: string
): string {
  const params = new URLSearchParams({ title });
  if (description) {
    params.set("description", description.slice(0, 160));
  }
  if (type) {
    params.set("type", type);
  }
  return `/api/og?${params.toString()}`;
}

/**
 * Generate metadata for a specific page.
 * Titles longer than 51 chars, or already containing the brand name,
 * are set as absolute to avoid the "Title | Reflet | Reflet" duplication.
 */
export function generatePageMetadata(options: {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
  ogImage?: string;
  type?: string;
}): Metadata {
  const {
    title,
    description,
    path = "",
    keywords = [],
    noIndex = false,
    ogImage,
    type,
  } = options;

  const url = `${BASE_URL}${path}`;
  const allKeywords = [...DEFAULT_KEYWORDS, ...keywords];
  const image =
    ogImage ?? buildOgImageUrl(title, description, type ?? undefined);

  // Use absolute title when it's long enough to overflow the template,
  // or when it already contains the brand name.
  const needsAbsoluteTitle =
    title.length > 51 || title.toLowerCase().includes("reflet");
  const titleValue = needsAbsoluteTitle ? { absolute: title } : title;

  return {
    title: titleValue,
    description,
    keywords: allKeywords,
    openGraph: {
      title,
      description,
      url,
      locale: "en_US",
      type: "website",
      siteName: SITE_NAME,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    alternates: {
      canonical: url,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

/**
 * Generate metadata for organization public pages
 */
export function generateOrgMetadata(options: {
  orgName: string;
  orgSlug: string;
  page: "feedback" | "roadmap" | "changelog" | "feedback-item";
  description?: string;
  feedbackId?: string;
}): Metadata {
  const { orgName, orgSlug, page, description, feedbackId } = options;

  const titles = {
    feedback: `${orgName} - Feature Requests & Feedback`,
    roadmap: `${orgName} - Product Roadmap`,
    changelog: `${orgName} - Changelog & Updates`,
    "feedback-item": `Feedback | ${orgName}`,
  } as const;

  const descriptions = {
    feedback: `Submit feature requests and feedback for ${orgName}. Vote on ideas and help shape the product.`,
    roadmap: `See what ${orgName} is working on and what's coming next. Transparent product roadmap.`,
    changelog: `Stay up to date with the latest updates and improvements from ${orgName}.`,
    "feedback-item": `View feature requests and feedback for ${orgName}.`,
  } as const;

  const paths = {
    feedback: `/${orgSlug}`,
    roadmap: `/${orgSlug}/roadmap`,
    changelog: `/${orgSlug}/changelog`,
    "feedback-item": `/${orgSlug}/feedback/${feedbackId ?? ""}`,
  } as const;

  return generatePageMetadata({
    title: titles[page],
    description: description ?? descriptions[page],
    path: paths[page],
    keywords: [orgName, page, "product updates"],
  });
}
