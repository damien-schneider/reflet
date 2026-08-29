import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import LandingPage from "@/features/homepage/components/landing/landing-page";
import { BASE_URL } from "@/lib/seo-config";
import { getHomePageJsonLd } from "@/lib/seo-json-ld";

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
      <LandingPage />
    </>
  );
}
