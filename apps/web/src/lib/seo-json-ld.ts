import { BASE_URL, DEFAULT_DESCRIPTION, SITE_NAME } from "./seo-config";

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
          "Autonomous AI role skills",
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
          "7 Role Skills (CEO, PM, CTO, Growth, Sales, Support, Validator)",
          "Visible Runtime Chain — from market research to validated delivery",
          "AI Sales Prospecting and Lead Discovery",
          "AI Growth Marketing and Content Creation",
          "Shared Board Architecture — role skills communicate through visible artifacts",
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
          text: "Reflet is a fully autonomous AI company platform with one visible Autopilot chain. CEO, PM, CTO, Growth, Sales, Support, and Validator role skills discover market opportunities, create initiatives, write specs, prepare delivery, find sales leads, handle support, and validate outputs. Connect your GitHub repo and your Company Brief starts in 5 minutes. Reflet also includes a full product feedback platform with voting, roadmaps, and changelogs.",
        },
      },
      {
        "@type": "Question",
        name: "How does Reflet Autopilot work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Paste your GitHub repo URL and Reflet generates a Company Brief in 5 minutes — product definition, ICP, competitive landscape, and initial roadmap. Then role skills work through explicit reasons: PM creates initiatives from Growth research, CTO writes technical specs, Validator checks delivery, Growth announces features and finds leads, Sales contacts prospects, and Support triages user issues. You're the President — set strategy and approve key decisions.",
        },
      },
      {
        "@type": "Question",
        name: "What role skills does Reflet include?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Reflet includes 7 visible role skills: (1) CEO — strategic coordination and reporting, (2) PM — reads Growth research and creates initiatives, (3) CTO — technical specs and architecture decisions, (4) Growth — market research, content creation and feature announcements, (5) Sales — lead discovery and outreach, (6) Support — user issue triage and responses, and (7) Validator — output validation and delivery checks.",
        },
      },
      {
        "@type": "Question",
        name: "How does Reflet compare to Devin, Artisan, or Sintra AI?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Devin is an AI developer only — it writes code but doesn't handle product management, sales, or support. Artisan is an AI BDR — it does sales outreach but nothing else. Sintra AI offers individual AI workers that can operate independently without shared runtime state. Reflet provides a complete product operations chain: 7 integrated role skills that communicate through shared boards, durable execution records, blockers, and deliverables.",
        },
      },
      {
        "@type": "Question",
        name: "Is Reflet free?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, Reflet offers a free tier to get started. The Pro plan adds more role-skill capacity, priority processing, and advanced features. Reflet is also open source under the Server Side Public License (SSPL), so you can inspect the code and self-host your own instance from GitHub.",
        },
      },
      {
        "@type": "Question",
        name: "What is a zero-employee company?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "A zero-employee company is a business where AI handles operational work — product management, delivery planning, sales, marketing, support, and validation. Reflet makes this possible with one visible chain and 7 role skills that work from explicit runtime conditions. The human founder acts as President — setting strategic direction and approving key decisions.",
        },
      },
      {
        "@type": "Question",
        name: "Can I still use Reflet for feedback?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Reflet includes a full product feedback platform with voting boards, kanban roadmaps, changelogs, an embeddable widget, AI-powered triage, and GitHub integration. The feedback data feeds directly into Autopilot — the Support skill triages incoming requests, the PM skill reads feedback patterns to inform initiatives, and the Growth skill uses shipped features for content and announcements.",
        },
      },
    ],
  };
}

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
