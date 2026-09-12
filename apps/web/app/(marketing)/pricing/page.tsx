import { MarketingFooter } from "@/features/homepage/components/experience/marketing-footer";
import { MarketingNavigation } from "@/features/homepage/components/experience/marketing-navigation";
import { MarketingPricing } from "@/features/homepage/components/experience/marketing-pricing";
import { MarketingFaq } from "@/features/homepage/components/experience/marketing-sections";
import { generatePageMetadata } from "@/lib/seo-config";
import "@/features/homepage/components/experience/marketing.css";

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
  title: "Pricing | Reflet",
});

export default function PricingPage() {
  return (
    <div className="marketing-page">
      <MarketingNavigation />
      <main>
        <MarketingPricing standalone />
        <MarketingFaq />
      </main>
      <MarketingFooter />
    </div>
  );
}
