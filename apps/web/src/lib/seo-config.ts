import type { Metadata, Viewport } from "next";

export const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.reflet.app";
export const SITE_NAME = "Reflet";
const DEFAULT_TITLE =
  "Reflet - The Feedback Platform for Developer-Led SaaS Teams";
export const DEFAULT_DESCRIPTION =
  "Ship what users actually want. Reflet helps developer-led SaaS teams collect feedback, prioritize with voting, auto-triage with AI, and close the loop with changelogs — from first request to shipped feature.";

const DEFAULT_KEYWORDS = [
  "product feedback",
  "feature requests",
  "roadmap",
  "user feedback",
  "feedback management",
  "product management",
  "changelog",
  "feature voting",
  "customer feedback",
  "product roadmap",
  "SaaS feedback",
  "user suggestions",
  "feedback board",
  "canny alternative",
  "productboard alternative",
  "featurebase alternative",
  "uservoice alternative",
  "nolt alternative",
  "frill alternative",
  "upvoty alternative",
  "open source feedback tool",
  "self-hosted feedback",
  "feature request tool",
  "feedback widget",
  "product feedback platform",
];

export const siteConfig = {
  author: "Reflet Team",
  description: DEFAULT_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  name: SITE_NAME,
  twitterHandle: "@reflet_app",
  url: BASE_URL,
};

export const viewport: Viewport = {
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { color: "#ffffff", media: "(prefers-color-scheme: light)" },
    { color: "#0a0a0a", media: "(prefers-color-scheme: dark)" },
  ],
  width: "device-width",
};

const DEFAULT_OG_IMAGE = "/api/og";

export const defaultMetadata: Metadata = {
  alternates: {
    types: {
      "application/rss+xml": `${BASE_URL}/feed.xml`,
    },
  },
  appleWebApp: {
    statusBarStyle: "default",
    title: "Reflet",
  },
  applicationName: SITE_NAME,
  authors: [{ name: "Reflet Team", url: BASE_URL }],
  category: "technology",
  classification: "Business Software",
  creator: "Reflet",
  description: DEFAULT_DESCRIPTION,
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  generator: "Next.js",
  keywords: DEFAULT_KEYWORDS,
  metadataBase: new URL(BASE_URL),
  openGraph: {
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        alt: "Reflet - Product Feedback & Roadmap Platform",
        height: 630,
        type: "image/png",
        url: DEFAULT_OG_IMAGE,
        width: 1200,
      },
    ],
    locale: "en_US",
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    type: "website",
    url: BASE_URL,
  },
  publisher: "Reflet",
  referrer: "origin-when-cross-origin",
  robots: {
    follow: true,
    googleBot: {
      follow: true,
      index: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
    index: true,
    nocache: false,
  },
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  twitter: {
    card: "summary_large_image",
    creator: "@reflet_app",
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
    site: "@reflet_app",
    title: DEFAULT_TITLE,
  },
  verification: {
    // Add your verification codes here when available
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // bing: 'your-bing-verification-code',
  },
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
    alternates: {
      canonical: url,
    },
    description,
    keywords: allKeywords,
    openGraph: {
      description,
      images: [
        {
          alt: title,
          height: 630,
          type: "image/png",
          url: image,
          width: 1200,
        },
      ],
      locale: "en_US",
      siteName: SITE_NAME,
      title,
      type: "website",
      url,
    },
    robots: noIndex
      ? { follow: false, index: false }
      : { follow: true, index: true },
    title: titleValue,
    twitter: {
      card: "summary_large_image",
      description,
      images: [image],
      title,
    },
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
    changelog: `${orgName} - Changelog & Updates`,
    feedback: `${orgName} - Feature Requests & Feedback`,
    "feedback-item": `Feedback | ${orgName}`,
    roadmap: `${orgName} - Product Roadmap`,
  } as const;

  const descriptions = {
    changelog: `Stay up to date with the latest updates and improvements from ${orgName}.`,
    feedback: `Submit feature requests and feedback for ${orgName}. Vote on ideas and help shape the product.`,
    "feedback-item": `View feature requests and feedback for ${orgName}.`,
    roadmap: `See what ${orgName} is working on and what's coming next. Transparent product roadmap.`,
  } as const;

  const paths = {
    changelog: `/${orgSlug}/changelog`,
    feedback: `/${orgSlug}`,
    "feedback-item": `/${orgSlug}/feedback/${feedbackId ?? ""}`,
    roadmap: `/${orgSlug}/roadmap`,
  } as const;

  return generatePageMetadata({
    description: description ?? descriptions[page],
    keywords: [orgName, page, "product updates"],
    path: paths[page],
    title: titles[page],
  });
}
