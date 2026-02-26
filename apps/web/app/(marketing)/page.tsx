import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import Homepage from "@/features/homepage/components/homepage";
import { BASE_URL } from "@/lib/seo-config";
import { getHomePageJsonLd } from "@/lib/seo-json-ld";

export const metadata: Metadata = {
  alternates: {
    canonical: BASE_URL,
  },
};

/**
 * Root index route — middleware redirects authenticated users to /dashboard
 */
export default function Index() {
  const jsonLd = getHomePageJsonLd();
  return (
    <>
      <JsonLd data={jsonLd} />
      <Homepage />
    </>
  );
}
