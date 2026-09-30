import { MarketingPricing } from "@/features/homepage/components/experience/marketing-pricing";
import { MarketingFaq } from "@/features/homepage/components/experience/marketing-sections";
import { MarketingSubpage } from "@/features/homepage/components/marketing-subpage";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata = generatePageMetadata({
  description:
    "Start collecting feedback for free. Upgrade to Pro for more feedback, unlimited team members, custom branding, custom domains, and API access.",
  keywords: [
    "pricing",
    "free tier",
    "SaaS pricing",
    "feedback tool pricing",
    "open source",
  ],
  path: "/pricing",
  title: "Pricing",
});

export default function PricingPage() {
  return (
    <MarketingSubpage>
      <MarketingPricing standalone />
      <MarketingFaq />
    </MarketingSubpage>
  );
}
