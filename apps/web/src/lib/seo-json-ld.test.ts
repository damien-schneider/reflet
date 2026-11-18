import { describe, expect, it } from "vitest";
import { BASE_URL } from "./seo-config";
import {
  getBlogPostJsonLd,
  getComparisonJsonLd,
  getHomePageJsonLd,
  getOrgPageJsonLd,
} from "./seo-json-ld";

describe("getHomePageJsonLd", () => {
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
      description: "Custom desc",
      orgName: "Acme",
      orgSlug: "acme",
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
    author: "John Doe",
    datePublished: "2025-01-15",
    description: "A test post",
    slug: "my-post",
    tags: ["react", "nextjs"],
    title: "My Post",
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
});

describe("getComparisonJsonLd", () => {
  it("returns WebPage type", () => {
    const ld = getComparisonJsonLd({
      competitorName: "Canny",
      description: "Comparison",
      slug: "reflet-vs-canny",
      title: "Reflet vs Canny",
    });

    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("WebPage");
    expect(ld.name).toBe("Reflet vs Canny");
    expect(ld.url).toBe(`${BASE_URL}/blog/reflet-vs-canny`);
  });

  it("contains both Reflet and competitor in about array", () => {
    const ld = getComparisonJsonLd({
      competitorName: "Productboard",
      description: "Compare",
      slug: "reflet-vs-productboard",
      title: "Reflet vs Productboard",
    });

    expect(ld.about).toHaveLength(2);
    expect(ld.about[0].name).toBe("Reflet");
    expect(ld.about[1].name).toBe("Productboard");
    expect(ld.about[0]["@type"]).toBe("SoftwareApplication");
    expect(ld.about[1]["@type"]).toBe("SoftwareApplication");
  });
});
