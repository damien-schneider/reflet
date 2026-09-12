import { MARKETING_FAQ } from "@/features/homepage/components/experience/marketing-faq-data";
import { BASE_URL, DEFAULT_DESCRIPTION, SITE_NAME } from "./seo-config";

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
          priceCurrency: "EUR",
        },
        operatingSystem: "Web",
      },
      getHomePageFaqJsonLd(),
    ],
  };
}

function getHomePageFaqJsonLd() {
  return {
    "@id": `${BASE_URL}/#faq`,
    "@type": "FAQPage",
    mainEntity: MARKETING_FAQ.map((item) => ({
      "@type": "Question",
      acceptedAnswer: { "@type": "Answer", text: item.answer },
      name: item.question,
    })),
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
