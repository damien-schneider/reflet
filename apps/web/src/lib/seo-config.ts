import type { Metadata, Viewport } from "next";

export const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.reflet.app";
export const SITE_NAME = "Reflet";
const DEFAULT_TITLE =
  "Reflet – The feedback platform for developer-led SaaS teams";
const TITLE_TEMPLATE = `%s | ${SITE_NAME}`;
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
    { color: "#f8f8f6", media: "(prefers-color-scheme: light)" },
    { color: "#292724", media: "(prefers-color-scheme: dark)" },
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
  metadataBase: URL.parse(BASE_URL) ?? URL.parse("https://www.reflet.app"),
  openGraph: {
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        alt: "Reflet – Product feedback and roadmap platform",
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
    template: TITLE_TEMPLATE,
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
  const titleValue = needsAbsoluteTitle
    ? { absolute: title }
    : { default: title, template: TITLE_TEMPLATE };

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
