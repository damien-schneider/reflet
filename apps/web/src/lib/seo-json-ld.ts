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
          "Autonomous AI agents",
          "AI company automation",
          "AI product management",
          "AI software development",
          "AI sales and growth",
          "AI security scanning",
          "AI support automation",
          "Product feedback management",
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
          "7 Autonomous AI Agents (CEO, PM, CTO, Dev, Growth, Sales, Support)",
          "Autonomous Product Development — from market research to shipped PRs",
          "AI Sales Prospecting and Lead Discovery",
          "AI Growth Marketing and Content Creation",
          "Shared Board Architecture — agents communicate like real employees",
          "Supervised, Full Auto, and Manual Autonomy Modes",
          "User Feedback Collection and Roadmap Planning",
          "Real-time Collaboration with GitHub Integration",
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
          text: "Reflet is the world's first fully autonomous AI company. 7 specialized AI agents — CEO, PM, CTO, Dev, Growth, Sales, and Support — autonomously run your product 24/7. They discover market opportunities, create initiatives, write specs, ship code via PRs, find sales leads, and handle support. Connect your GitHub repo and your AI company starts working in 5 minutes. Reflet also includes a full product feedback platform with voting, roadmaps, and changelogs.",
        },
      },
      {
        "@type": "Question",
        name: "How does Reflet Autopilot work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Paste your GitHub repo URL and Reflet generates a Company Brief in 5 minutes — product definition, ICP, competitive landscape, and initial roadmap. Then 7 AI agents start working autonomously: PM creates initiatives from Growth's market research, CTO writes technical specs, Dev ships pull requests, Growth announces features and finds leads, Sales contacts prospects, Support triages user issues. You're the President — set strategy and approve key decisions.",
        },
      },
      {
        "@type": "Question",
        name: "What AI agents does Reflet include?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Reflet includes 7 autonomous AI agents: (1) CEO — strategic coordination and reporting, (2) PM — reads Growth's market research and creates initiatives, (3) CTO — technical specs and architecture decisions, (4) Dev — code generation and pull requests, (5) Growth — market research, content creation and feature announcements, (6) Sales — lead discovery and outreach, (7) Support — user issue triage and responses.",
        },
      },
      {
        "@type": "Question",
        name: "How does Reflet compare to Devin, Artisan, or Sintra AI?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Devin is an AI developer only — it writes code but doesn't handle product management, sales, or support. Artisan is an AI BDR — it does sales outreach but nothing else. Sintra AI offers individual AI workers but they operate independently without coordination. Reflet is the only platform that provides a complete autonomous AI company: 7 integrated agents that communicate through a shared board architecture, covering every role from CEO to Support. One platform replaces an entire team.",
        },
      },
      {
        "@type": "Question",
        name: "Is Reflet free?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, Reflet offers a free tier to get started. The Pro plan adds more agent capacity, priority processing, and advanced features. Reflet is also open source under the Server Side Public License (SSPL), so you can inspect the code and self-host your own instance from GitHub.",
        },
      },
      {
        "@type": "Question",
        name: "What is a zero-employee company?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "A zero-employee company is a business where AI agents handle all operational roles — product management, development, sales, marketing, support, and more. Reflet makes this possible with 7 autonomous AI agents that work 24/7. The human founder acts as 'President' — setting strategic direction and approving key decisions while the AI team executes autonomously.",
        },
      },
      {
        "@type": "Question",
        name: "Can I still use Reflet for feedback?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Reflet includes a full product feedback platform with voting boards, kanban roadmaps, changelogs, an embeddable widget, AI-powered triage, and GitHub integration. The feedback data feeds directly into Autopilot — the Support agent triages incoming requests, the PM agent reads feedback patterns to inform initiatives, and the Growth agent uses shipped features for content and announcements.",
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
    name: title,
    description: description ?? `Feature request for ${orgName}: ${title}`,
    url,
    mainEntity: {
      "@type": "Question",
      name: title,
      text: description ?? title,
      answerCount: status === "completed" ? 1 : 0,
      upvoteCount: voteCount,
      author: {
        "@type": "Organization",
        name: orgName,
      },
    },
    isPartOf: {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
    },
  };
}
