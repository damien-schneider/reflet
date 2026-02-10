import type { Metadata, Viewport } from "next";

export const BASE_URL = "https://reflet.app";
export const SITE_NAME = "Reflet";
const DEFAULT_TITLE = "Reflet - Product Feedback & Roadmap Platform";
export const DEFAULT_DESCRIPTION =
  "Collect user feedback, prioritize features with voting, and share transparent roadmaps. Build products your users love with Reflet's modern feedback management platform.";

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
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Reflet - Product Feedback & Roadmap Platform",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: ["/og-image.png"],
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
    canonical: BASE_URL,
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
  },
  category: "technology",
  classification: "Business Software",
};

/**
 * Generate metadata for a specific page
 */
export function generatePageMetadata(options: {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
  ogImage?: string;
}): Metadata {
  const {
    title,
    description,
    path = "",
    keywords = [],
    noIndex = false,
    ogImage,
  } = options;

  const url = `${BASE_URL}${path}`;
  const allKeywords = [...DEFAULT_KEYWORDS, ...keywords];
  const image = ogImage ?? "/og-image.png";

  return {
    title,
    description,
    keywords: allKeywords,
    openGraph: {
      title,
      description,
      url,
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
  page: "feedback" | "roadmap" | "changelog";
  description?: string;
}): Metadata {
  const { orgName, orgSlug, page, description } = options;

  const titles = {
    feedback: `${orgName} - Feature Requests & Feedback`,
    roadmap: `${orgName} - Product Roadmap`,
    changelog: `${orgName} - Changelog & Updates`,
  } as const;

  const descriptions = {
    feedback: `Submit feature requests and feedback for ${orgName}. Vote on ideas and help shape the product.`,
    roadmap: `See what ${orgName} is working on and what's coming next. Transparent product roadmap.`,
    changelog: `Stay up to date with the latest updates and improvements from ${orgName}.`,
  } as const;

  return generatePageMetadata({
    title: titles[page],
    description: description ?? descriptions[page],
    path: page === "feedback" ? `/${orgSlug}` : `/${orgSlug}/${page}`,
    keywords: [orgName, page, "product updates"],
  });
}
