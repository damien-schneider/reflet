import { BASE_URL, DEFAULT_DESCRIPTION, SITE_NAME } from "./seo-config";

/**
 * BreadcrumbList JSON-LD for navigation hierarchy.
 * Helps search engines understand page depth and display breadcrumbs in results.
 */
export function getBreadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${BASE_URL}${item.path}`,
    })),
  };
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
        sameAs: [
          "https://github.com/damien-schneider/reflet",
          "https://x.com/reflet_app",
        ],
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
        name: "How does Reflet compare to Canny, Productboard, or Featurebase?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Reflet is an open-source alternative to Canny, Productboard, Featurebase, UserVoice, Nolt, Frill, and other feedback tools. Unlike closed-source competitors, Reflet offers full code transparency, self-hosting, and a generous free tier. It provides feedback boards with upvoting, roadmap kanban boards, changelog releases, and AI-powered triage. Reflet uses Convex for real-time sync (<50ms) and supports multi-tenant organizations with role-based access.",
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
          text: "Reflet includes: feedback collection with upvoting and comments, kanban-style roadmaps, changelog and release notes, real-time collaboration, team and organization management, custom branding and domain, private and public boards, full-text search, AI-powered feedback triage, embeddable widget, REST API and webhooks, and two-way GitHub integration.",
        },
      },
      {
        "@type": "Question",
        name: "What are the best alternatives to Featurebase?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The best alternatives to Featurebase include Reflet (open-source, free tier, self-hostable), Canny (established SaaS), Productboard (enterprise product management), Fider (open-source, Go-based), Nolt (simple voting boards), Frill (developer-friendly), and UserVoice (enterprise). Reflet stands out as the only modern, open-source alternative with real-time sync, AI triage, and transparent pricing starting at $0/month.",
        },
      },
      {
        "@type": "Question",
        name: "What is the best open-source feedback tool?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Reflet is a leading open-source product feedback tool built with React 19, Next.js, and Convex. It offers feedback collection, feature voting, roadmaps, changelogs, AI-powered triage, and GitHub integration. Unlike Fider (Go-based), Reflet uses a modern TypeScript stack and provides a polished UI with real-time synchronization. It's available as a hosted service at reflet.app or can be self-hosted under the SSPL license.",
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

/**
 * JSON-LD structured data for blog posts (Article schema)
 */
export function getBlogPostJsonLd(options: {
  title: string;
  description: string;
  slug: string;
  datePublished: string;
  dateModified?: string;
  author: string;
  tags: string[];
  ogImage?: string;
}) {
  const {
    title,
    description,
    slug,
    datePublished,
    dateModified,
    author,
    tags,
    ogImage,
  } = options;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url: `${BASE_URL}/blog/${slug}`,
    datePublished,
    dateModified: dateModified ?? datePublished,
    author: {
      "@type": "Person",
      name: author,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/logo.png`,
      },
    },
    image: ogImage ?? `${BASE_URL}/og-image.png`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/blog/${slug}`,
    },
    keywords: tags.join(", "),
  };
}

/**
 * JSON-LD for comparison pages (ItemList schema)
 */
export function getComparisonJsonLd(options: {
  title: string;
  description: string;
  slug: string;
  competitorName: string;
}) {
  const { title, description, slug, competitorName } = options;

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: `${BASE_URL}/blog/${slug}`,
    about: [
      {
        "@type": "SoftwareApplication",
        name: "Reflet",
        applicationCategory: "BusinessApplication",
      },
      {
        "@type": "SoftwareApplication",
        name: competitorName,
        applicationCategory: "BusinessApplication",
      },
    ],
  };
}

/**
 * JSON-LD for HowTo guides
 */
export function getHowToJsonLd(options: {
  title: string;
  description: string;
  slug: string;
  steps: { name: string; text: string }[];
  totalTime?: string;
}) {
  const { title, description, slug, steps, totalTime } = options;

  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: title,
    description,
    url: `${BASE_URL}/blog/${slug}`,
    totalTime: totalTime ?? "PT30M",
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };
}
