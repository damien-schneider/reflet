import type { Metadata, Viewport } from "next";

const BASE_URL = "https://reflet.app";
const SITE_NAME = "Reflet";
const DEFAULT_TITLE = "Reflet - Product Feedback & Roadmap Platform";
const DEFAULT_DESCRIPTION =
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

/**
 * JSON-LD structured data for the homepage
 */
export function getHomePageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${BASE_URL}/#website`,
        url: BASE_URL,
        name: SITE_NAME,
        description: DEFAULT_DESCRIPTION,
        publisher: {
          "@id": `${BASE_URL}/#organization`,
        },
        potentialAction: [
          {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
          },
        ],
        inLanguage: "en-US",
      },
      {
        "@type": "Organization",
        "@id": `${BASE_URL}/#organization`,
        name: SITE_NAME,
        url: BASE_URL,
        description: DEFAULT_DESCRIPTION,
        knowsAbout: [
          "Product feedback management",
          "Feature request voting",
          "Product roadmap",
          "Changelog and release notes",
          "User feedback collection",
        ],
        logo: {
          "@type": "ImageObject",
          inLanguage: "en-US",
          "@id": `${BASE_URL}/#logo`,
          url: `${BASE_URL}/logo.png`,
          contentUrl: `${BASE_URL}/logo.png`,
          width: 512,
          height: 512,
          caption: SITE_NAME,
        },
        image: { "@id": `${BASE_URL}/#logo` },
        sameAs: ["https://github.com/damien-schneider/reflet"],
      },
      {
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: DEFAULT_DESCRIPTION,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: "Free tier available",
        },
        featureList: [
          "User Feedback Collection",
          "Feature Request Voting",
          "Product Roadmap",
          "Changelog Management",
          "Real-time Collaboration",
          "Team Management",
          "Custom Branding",
        ],
      },
      getHomePageFaqJsonLd(),
    ],
  };
}

/**
 * FAQPage JSON-LD for GEO (Generative Engine Optimization).
 * FAQ schema increases AI citation visibility by ~40% (Princeton GEO research).
 */
function getHomePageFaqJsonLd() {
  return {
    "@type": "FAQPage",
    "@id": `${BASE_URL}/#faq`,
    mainEntity: [
      {
        "@type": "Question",
        name: "What is Reflet?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Reflet is a modern product feedback and roadmap platform. It helps product teams collect user feedback, prioritize features with voting, and share transparent roadmaps. Reflet offers real-time collaboration, changelog management, and custom branding—with a free tier and optional Pro plan.",
        },
      },
      {
        "@type": "Question",
        name: "How does Reflet compare to Canny or Productboard?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Reflet is an open-source alternative to Canny and Productboard. It provides feedback boards with upvoting, roadmap kanban boards, and changelog releases. Reflet uses Convex for real-time sync and supports multi-tenant organizations with role-based access (Owner, Admin, Member).",
        },
      },
      {
        "@type": "Question",
        name: "Is Reflet free to use?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Reflet offers a free tier to get started. The Pro plan adds more boards, members, custom branding, and API access. You can self-host Reflet (open source, GitHub) or use the hosted service at reflet.app.",
        },
      },
      {
        "@type": "Question",
        name: "Can I self-host Reflet?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Reflet is open source under the Server Side Public License (SSPL). You can clone the repository from GitHub, run it with Bun and Convex, and self-host your own instance. The tech stack is React 19, Next.js App Router, Convex, and Better-Auth.",
        },
      },
      {
        "@type": "Question",
        name: "What are Reflet's main features?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Reflet includes: feedback collection with upvoting and comments, kanban-style roadmaps, changelog and release notes, real-time collaboration, team and organization management, custom branding and domain, private and public boards, full-text search, and optional GitHub integration.",
        },
      },
    ],
  };
}

/**
 * JSON-LD structured data for organization pages
 */
export function getOrgPageJsonLd(options: {
  orgName: string;
  orgSlug: string;
  description?: string;
}) {
  const { orgName, orgSlug, description } = options;
  const url = `${BASE_URL}/${orgSlug}`;

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${orgName} - Feedback & Roadmap`,
    description:
      description ?? `Submit feedback and track the roadmap for ${orgName}`,
    url,
    isPartOf: {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
    },
    about: {
      "@type": "Organization",
      name: orgName,
    },
  };
}
