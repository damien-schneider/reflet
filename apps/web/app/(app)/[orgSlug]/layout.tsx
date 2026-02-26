import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo-config";
import PublicOrgLayoutClient from "./layout-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}): Promise<Metadata> {
  const { orgSlug } = await params;

  return generatePageMetadata({
    title: `${orgSlug} - Feature Requests & Feedback`,
    description: `Submit feature requests and feedback for ${orgSlug}. Vote on ideas and help shape the product.`,
    path: `/${orgSlug}`,
    keywords: ["feedback", "feature requests", "product feedback", orgSlug],
  });
}

export default function PublicOrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  return (
    <PublicOrgLayoutClient params={params}>{children}</PublicOrgLayoutClient>
  );
}
