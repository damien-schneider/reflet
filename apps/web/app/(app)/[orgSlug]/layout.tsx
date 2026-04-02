import { api } from "@reflet/backend/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import { generatePageMetadata } from "@/lib/seo-config";
import { getBreadcrumbJsonLd, getOrgPageJsonLd } from "@/lib/seo-json-ld";

import PublicOrgLayoutClient from "./layout-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}): Promise<Metadata> {
  const { orgSlug } = await params;

  try {
    const orgs = await fetchQuery(api.sitemap_public.getPublicOrgSlugs, {});
    const org = orgs.find((o: { slug: string }) => o.slug === orgSlug);
    if (org) {
      return generatePageMetadata({
        title: `${orgSlug} - Feature Requests & Feedback`,
        description: `Submit feature requests and feedback for ${orgSlug}. Vote on ideas and help shape the product.`,
        path: `/${orgSlug}`,
        keywords: ["feedback", "feature requests", "product feedback", orgSlug],
      });
    }
  } catch {
    // fall through to default
  }

  return generatePageMetadata({
    title: `${orgSlug} - Feature Requests & Feedback`,
    description: `Submit feature requests and feedback for ${orgSlug}. Vote on ideas and help shape the product.`,
    path: `/${orgSlug}`,
    keywords: ["feedback", "feature requests", "product feedback", orgSlug],
  });
}

export default async function PublicOrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const jsonLd = getOrgPageJsonLd({
    orgName: orgSlug,
    orgSlug,
  });

  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: orgSlug, path: `/${orgSlug}` },
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <PublicOrgLayoutClient params={params}>{children}</PublicOrgLayoutClient>
    </>
  );
}
