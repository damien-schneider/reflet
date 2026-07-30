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
      item: `${BASE_URL}${item.path}`,
      name: item.name,
      position: index + 1,
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
        "@id": `${BASE_URL}/#website`,
        "@type": "WebSite",
        description: DEFAULT_DESCRIPTION,
        inLanguage: "en-US",
        name: SITE_NAME,
        publisher: {
          "@id": `${BASE_URL}/#organization`,
        },
        url: BASE_URL,
      },
      {
        "@id": `${BASE_URL}/#organization`,
        "@type": "Organization",
        description: DEFAULT_DESCRIPTION,
        image: { "@id": `${BASE_URL}/#logo` },
        knowsAbout: [
          "Product feedback management",
          "Feature request voting",
          "Product roadmap",
          "Changelog and release notes",
          "User feedback collection",
        ],
        logo: {
          "@id": `${BASE_URL}/#logo`,
          "@type": "ImageObject",
          caption: SITE_NAME,
          contentUrl: `${BASE_URL}/logo.png`,
          height: 512,
          inLanguage: "en-US",
          url: `${BASE_URL}/logo.png`,
          width: 512,
        },
        name: SITE_NAME,
        sameAs: [
          "https://github.com/damien-schneider/reflet",
          "https://x.com/reflet_app",
        ],
        url: BASE_URL,
      },
      {
        "@type": "SoftwareApplication",
        applicationCategory: "BusinessApplication",
        description: DEFAULT_DESCRIPTION,
        featureList: [
          "User Feedback Collection",
          "Feature Request Voting",
          "Product Roadmap",
          "Changelog Management",
          "Real-time Collaboration",
          "Team Management",
          "Custom Branding",
        ],
        name: SITE_NAME,
        offers: {
          "@type": "Offer",
          description: "Free tier available",
          price: "0",
          priceCurrency: "USD",
        },
        operatingSystem: "Web",
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
    "@id": `${BASE_URL}/#faq`,
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Reflet is a modern product feedback and roadmap platform. It helps product teams collect user feedback, prioritize features with voting, and share transparent roadmaps. Reflet offers real-time collaboration, changelog management, and custom branding—with a free tier and optional Pro plan.",
        },
        name: "What is Reflet?",
      },
      {
        "@type": "Question",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Reflet is an open-source alternative to Canny, Productboard, Featurebase, UserVoice, Nolt, Frill, and other feedback tools. Unlike closed-source competitors, Reflet offers full code transparency, self-hosting, and a generous free tier. It provides feedback boards with upvoting, roadmap kanban boards, changelog releases, and AI-powered triage. Reflet uses Convex for real-time sync (<50ms) and supports multi-tenant organizations with role-based access.",
        },
        name: "How does Reflet compare to Canny, Productboard, or Featurebase?",
      },
      {
        "@type": "Question",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Reflet offers a free tier to get started. The Pro plan adds more boards, members, custom branding, and API access. You can self-host Reflet (open source, GitHub) or use the hosted service at reflet.app.",
        },
        name: "Is Reflet free to use?",
      },
      {
        "@type": "Question",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Reflet is open source under the Server Side Public License (SSPL). You can clone the repository from GitHub, run it with Bun and Convex, and self-host your own instance. The tech stack is React 19, Next.js App Router, Convex, and Better-Auth.",
        },
        name: "Can I self-host Reflet?",
      },
      {
        "@type": "Question",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Reflet includes: feedback collection with upvoting and comments, kanban-style roadmaps, changelog and release notes, real-time collaboration, team and organization management, custom branding and domain, private and public boards, full-text search, AI-powered feedback triage, embeddable widget, REST API and webhooks, and two-way GitHub integration.",
        },
        name: "What are Reflet's main features?",
      },
      {
        "@type": "Question",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The best alternatives to Featurebase include Reflet (open-source, free tier, self-hostable), Canny (established SaaS), Productboard (enterprise product management), Fider (open-source, Go-based), Nolt (simple voting boards), Frill (developer-friendly), and UserVoice (enterprise). Reflet stands out as the only modern, open-source alternative with real-time sync, AI triage, and transparent pricing starting at $0/month.",
        },
        name: "What are the best alternatives to Featurebase?",
      },
      {
        "@type": "Question",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Reflet is a leading open-source product feedback tool built with React 19, Next.js, and Convex. It offers feedback collection, feature voting, roadmaps, changelogs, AI-powered triage, and GitHub integration. Unlike Fider (Go-based), Reflet uses a modern TypeScript stack and provides a polished UI with real-time synchronization. It's available as a hosted service at reflet.app or can be self-hosted under the SSPL license.",
        },
        name: "What is the best open-source feedback tool?",
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
    about: {
      "@type": "Organization",
      name: orgName,
    },
    description:
      description ?? `Submit feedback and track the roadmap for ${orgName}`,
    isPartOf: {
      "@id": `${BASE_URL}/#website`,
      "@type": "WebSite",
    },
    name: `${orgName} - Feedback & Roadmap`,
    url,
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
    author: {
      "@type": "Person",
      name: author,
    },
    dateModified: dateModified ?? datePublished,
    datePublished,
    description,
    headline: title,
    image: ogImage ?? `${BASE_URL}/og-image.png`,
    keywords: tags.join(", "),
    mainEntityOfPage: {
      "@id": `${BASE_URL}/blog/${slug}`,
      "@type": "WebPage",
    },
    publisher: {
      "@type": "Organization",
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/logo.png`,
      },
      name: SITE_NAME,
    },
    url: `${BASE_URL}/blog/${slug}`,
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
    about: [
      {
        "@type": "SoftwareApplication",
        applicationCategory: "BusinessApplication",
        name: "Reflet",
      },
      {
        "@type": "SoftwareApplication",
        applicationCategory: "BusinessApplication",
        name: competitorName,
      },
    ],
    description,
    name: title,
    url: `${BASE_URL}/blog/${slug}`,
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
    description,
    name: title,
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      name: step.name,
      position: index + 1,
      text: step.text,
    })),
    totalTime: totalTime ?? "PT30M",
    url: `${BASE_URL}/blog/${slug}`,
  };
}

/**
 * JSON-LD structured data for individual feedback items.
 * Uses QAPage schema to represent user questions/requests.
 */
export function getFeedbackItemJsonLd(options: {
  title: string;
  description?: string;
  orgName: string;
  orgSlug: string;
  feedbackId: string;
  status: string;
  voteCount: number;
}) {
  const {
    title,
    description,
    orgName,
    orgSlug,
    feedbackId,
    status,
    voteCount,
  } = options;
  const url = `${BASE_URL}/${orgSlug}/feedback/${feedbackId}`;

  return {
    "@context": "https://schema.org",
    "@type": "QAPage",
    description: description ?? `Feature request for ${orgName}: ${title}`,
    isPartOf: {
      "@id": `${BASE_URL}/#website`,
      "@type": "WebSite",
    },
    mainEntity: {
      "@type": "Question",
      answerCount: status === "completed" ? 1 : 0,
      author: {
        "@type": "Organization",
        name: orgName,
      },
      name: title,
      text: description ?? title,
      upvoteCount: voteCount,
    },
    name: title,
    url,
  };
}
