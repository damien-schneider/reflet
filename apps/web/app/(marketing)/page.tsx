import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import Homepage from "@/features/homepage/components/homepage";
import { BASE_URL } from "@/lib/seo-config";
import { getHomePageJsonLd } from "@/lib/seo-json-ld";

// Next replaces HTML Vary headers; do not cache the negotiated homepage.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: {
    canonical: BASE_URL,
  },
};

export default function Index() {
  const jsonLd = getHomePageJsonLd();
  return (
    <>
      <JsonLd data={jsonLd} />
      <Homepage />
    </>
  );
}
