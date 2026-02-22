import { describe, expect, it } from "vitest";
import { BASE_URL, DEFAULT_DESCRIPTION, SITE_NAME } from "./seo-config";
import {
  getBlogPostJsonLd,
  getComparisonJsonLd,
  getHomePageJsonLd,
  getHowToJsonLd,
  getOrgPageJsonLd,
} from "./seo-json-ld";

describe("getHomePageJsonLd", () => {
  it("returns schema.org context", () => {
    const ld = getHomePageJsonLd();
    expect(ld["@context"]).toBe("https://schema.org");
  });

  it("contains @graph with multiple entries", () => {
    const ld = getHomePageJsonLd();
    expect(ld["@graph"]).toBeInstanceOf(Array);
    expect(ld["@graph"].length).toBeGreaterThanOrEqual(4);
  });

  it("contains a WebSite entry", () => {
    const ld = getHomePageJsonLd();
    const webSite = ld["@graph"].find(
      (item: Record<string, unknown>) => item["@type"] === "WebSite"
    );
    expect(webSite).toBeDefined();
    expect(webSite.url).toBe(BASE_URL);
    expect(webSite.name).toBe(SITE_NAME);
    expect(webSite.description).toBe(DEFAULT_DESCRIPTION);
    expect(webSite.inLanguage).toBe("en-US");
  });

  it("contains an Organization entry", () => {
    const ld = getHomePageJsonLd();
    const org = ld["@graph"].find(
      (item: Record<string, unknown>) => item["@type"] === "Organization"
    );
    expect(org).toBeDefined();
    expect(org.name).toBe(SITE_NAME);
    expect(org.url).toBe(BASE_URL);
    expect(org.logo).toBeDefined();
    expect(org.sameAs).toBeInstanceOf(Array);
  });

  it("contains a SoftwareApplication entry", () => {
    const ld = getHomePageJsonLd();
    const app = ld["@graph"].find(
      (item: Record<string, unknown>) => item["@type"] === "SoftwareApplication"
    );
    expect(app).toBeDefined();
    expect(app.name).toBe(SITE_NAME);
    expect(app.applicationCategory).toBe("BusinessApplication");
    expect(app.operatingSystem).toBe("Web");
    expect(app.featureList).toBeInstanceOf(Array);
    expect(app.offers).toBeDefined();
  });

  it("contains a FAQPage entry with questions", () => {
    const ld = getHomePageJsonLd();
    const faq = ld["@graph"].find(
      (item: Record<string, unknown>) => item["@type"] === "FAQPage"
    );
    expect(faq).toBeDefined();
    expect(faq.mainEntity).toBeInstanceOf(Array);
    expect(faq.mainEntity.length).toBeGreaterThan(0);

    for (const q of faq.mainEntity) {
      expect(q["@type"]).toBe("Question");
      expect(q.name).toBeTruthy();
      expect(q.acceptedAnswer).toBeDefined();
      expect(q.acceptedAnswer["@type"]).toBe("Answer");
      expect(q.acceptedAnswer.text).toBeTruthy();
    }
  });

  it("contains SearchAction in WebSite", () => {
    const ld = getHomePageJsonLd();
    const webSite = ld["@graph"].find(
      (item: Record<string, unknown>) => item["@type"] === "WebSite"
    );
    expect(webSite.potentialAction).toBeInstanceOf(Array);
    expect(webSite.potentialAction[0]["@type"]).toBe("SearchAction");
  });
});

describe("getOrgPageJsonLd", () => {
  it("returns WebPage type with org info", () => {
    const ld = getOrgPageJsonLd({
      orgName: "Acme",
      orgSlug: "acme",
    });

    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("WebPage");
    expect(ld.name).toContain("Acme");
    expect(ld.url).toBe(`${BASE_URL}/acme`);
  });

  it("uses custom description when provided", () => {
    const ld = getOrgPageJsonLd({
      orgName: "Acme",
      orgSlug: "acme",
      description: "Custom desc",
    });

    expect(ld.description).toBe("Custom desc");
  });

  it("uses default description when not provided", () => {
    const ld = getOrgPageJsonLd({
      orgName: "Acme",
      orgSlug: "acme",
    });

    expect(ld.description).toContain("Acme");
  });

  it("links to parent WebSite", () => {
    const ld = getOrgPageJsonLd({
      orgName: "Acme",
      orgSlug: "acme",
    });

    expect(ld.isPartOf["@type"]).toBe("WebSite");
    expect(ld.isPartOf["@id"]).toBe(`${BASE_URL}/#website`);
  });

  it("has about Organization with orgName", () => {
    const ld = getOrgPageJsonLd({ orgName: "TestOrg", orgSlug: "testorg" });
    expect(ld.about["@type"]).toBe("Organization");
    expect(ld.about.name).toBe("TestOrg");
  });
});

describe("getBlogPostJsonLd", () => {
  const baseArgs = {
    title: "My Post",
    description: "A test post",
    slug: "my-post",
    datePublished: "2025-01-15",
    author: "John Doe",
    tags: ["react", "nextjs"],
  };

  it("returns Article type with correct fields", () => {
    const ld = getBlogPostJsonLd(baseArgs);

    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Article");
    expect(ld.headline).toBe("My Post");
    expect(ld.description).toBe("A test post");
    expect(ld.url).toBe(`${BASE_URL}/blog/my-post`);
    expect(ld.datePublished).toBe("2025-01-15");
  });

  it("uses datePublished as dateModified when not specified", () => {
    const ld = getBlogPostJsonLd(baseArgs);
    expect(ld.dateModified).toBe("2025-01-15");
  });

  it("uses provided dateModified when specified", () => {
    const ld = getBlogPostJsonLd({
      ...baseArgs,
      dateModified: "2025-02-01",
    });
    expect(ld.dateModified).toBe("2025-02-01");
  });

  it("sets author as Person", () => {
    const ld = getBlogPostJsonLd(baseArgs);
    expect(ld.author["@type"]).toBe("Person");
    expect(ld.author.name).toBe("John Doe");
  });

  it("sets publisher as Organization", () => {
    const ld = getBlogPostJsonLd(baseArgs);
    expect(ld.publisher["@type"]).toBe("Organization");
    expect(ld.publisher.name).toBe(SITE_NAME);
  });

  it("joins tags with comma for keywords", () => {
    const ld = getBlogPostJsonLd(baseArgs);
    expect(ld.keywords).toBe("react, nextjs");
  });

  it("uses default og-image when ogImage not provided", () => {
    const ld = getBlogPostJsonLd(baseArgs);
    expect(ld.image).toBe(`${BASE_URL}/og-image.png`);
  });

  it("uses custom ogImage when provided", () => {
    const ld = getBlogPostJsonLd({
      ...baseArgs,
      ogImage: "/custom.png",
    });
    expect(ld.image).toBe("/custom.png");
  });

  it("handles empty tags array", () => {
    const ld = getBlogPostJsonLd({ ...baseArgs, tags: [] });
    expect(ld.keywords).toBe("");
  });
});

describe("getComparisonJsonLd", () => {
  it("returns WebPage type", () => {
    const ld = getComparisonJsonLd({
      title: "Reflet vs Canny",
      description: "Comparison",
      slug: "reflet-vs-canny",
      competitorName: "Canny",
    });

    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("WebPage");
    expect(ld.name).toBe("Reflet vs Canny");
    expect(ld.url).toBe(`${BASE_URL}/blog/reflet-vs-canny`);
  });

  it("contains both Reflet and competitor in about array", () => {
    const ld = getComparisonJsonLd({
      title: "Reflet vs Productboard",
      description: "Compare",
      slug: "reflet-vs-productboard",
      competitorName: "Productboard",
    });

    expect(ld.about).toHaveLength(2);
    expect(ld.about[0].name).toBe("Reflet");
    expect(ld.about[1].name).toBe("Productboard");
    expect(ld.about[0]["@type"]).toBe("SoftwareApplication");
    expect(ld.about[1]["@type"]).toBe("SoftwareApplication");
  });
});

describe("getHowToJsonLd", () => {
  const baseArgs = {
    title: "How to Collect Feedback",
    description: "A guide",
    slug: "how-to-collect-feedback",
    steps: [
      { name: "Step 1", text: "Do first thing" },
      { name: "Step 2", text: "Do second thing" },
    ],
  };

  it("returns HowTo type", () => {
    const ld = getHowToJsonLd(baseArgs);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("HowTo");
    expect(ld.name).toBe("How to Collect Feedback");
    expect(ld.url).toBe(`${BASE_URL}/blog/how-to-collect-feedback`);
  });

  it("maps steps with position starting at 1", () => {
    const ld = getHowToJsonLd(baseArgs);
    expect(ld.step).toHaveLength(2);
    expect(ld.step[0]["@type"]).toBe("HowToStep");
    expect(ld.step[0].position).toBe(1);
    expect(ld.step[0].name).toBe("Step 1");
    expect(ld.step[0].text).toBe("Do first thing");
    expect(ld.step[1].position).toBe(2);
  });

  it("defaults totalTime to PT30M", () => {
    const ld = getHowToJsonLd(baseArgs);
    expect(ld.totalTime).toBe("PT30M");
  });

  it("uses custom totalTime when provided", () => {
    const ld = getHowToJsonLd({ ...baseArgs, totalTime: "PT1H" });
    expect(ld.totalTime).toBe("PT1H");
  });

  it("handles empty steps array", () => {
    const ld = getHowToJsonLd({ ...baseArgs, steps: [] });
    expect(ld.step).toHaveLength(0);
  });
});
