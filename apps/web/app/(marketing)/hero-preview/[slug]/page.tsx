import type { Metadata } from "next";
import { notFound } from "next/navigation";

import HeroSwitcher from "@/features/homepage/components/landing/heroes/hero-switcher";
import {
  HERO_PROPOSALS,
  isHeroSlug,
} from "@/features/homepage/components/landing/heroes/proposals";
import { HERO_LAYOUTS } from "@/features/homepage/components/landing/heroes/registry";
import LandingPage from "@/features/homepage/components/landing/landing-page";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Hero preview",
};

export function generateStaticParams() {
  return HERO_PROPOSALS.map((proposal) => ({ slug: proposal.slug }));
}

export default async function HeroPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isHeroSlug(slug)) {
    notFound();
  }
  const Hero = HERO_LAYOUTS[slug];

  return (
    <>
      <LandingPage
        hero={
          <div className="[&>section]:min-h-[calc(100dvh-4rem)]">
            <Hero />
          </div>
        }
      />
      <HeroSwitcher />
    </>
  );
}
