import { notFound } from "next/navigation";
import {
  HERO_PROPOSALS,
  isHeroSlug,
} from "@/features/homepage/components/landing/heroes/proposals";
import { HERO_LAYOUTS } from "@/features/homepage/components/landing/heroes/registry";

export function generateStaticParams() {
  return HERO_PROPOSALS.map((proposal) => ({ slug: proposal.slug }));
}

export default async function HeroProposalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isHeroSlug(slug)) {
    notFound();
  }
  const Hero = HERO_LAYOUTS[slug];

  return <Hero />;
}
