import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { JsonLd } from "@/components/json-ld";
import Homepage from "@/features/homepage/components/homepage";
import { getToken } from "@/lib/auth-server";
import { BASE_URL } from "@/lib/seo-config";
import { getHomePageJsonLd } from "@/lib/seo-json-ld";

export const metadata: Metadata = {
  alternates: {
    canonical: BASE_URL,
  },
};

/**
 * Root index route
 * - If logged in → redirect to /dashboard (which handles org selection)
 * - If not logged in → show homepage
 */
export default async function Index() {
  const token = await getToken();

  // If authenticated, redirect to dashboard
  if (token) {
    redirect("/dashboard");
  }

  // Otherwise, show homepage with structured data
  const jsonLd = getHomePageJsonLd();
  return (
    <>
      <JsonLd data={jsonLd} />
      <Homepage />
    </>
  );
}
