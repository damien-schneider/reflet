import { MarketingHero } from "@/features/homepage/components/experience/hero/marketing-hero";
import { FeedbackJourney } from "@/features/homepage/components/experience/journey/feedback-journey";
import { MarketingFooter } from "@/features/homepage/components/experience/marketing-footer";
import {
  MARKETING_MAIN_ID,
  MarketingNavigation,
} from "@/features/homepage/components/experience/marketing-navigation";
import { MarketingPricing } from "@/features/homepage/components/experience/marketing-pricing";
import {
  MarketingFaq,
  MarketingSections,
} from "@/features/homepage/components/experience/marketing-sections";
import "@/features/homepage/components/experience/marketing.css";

export function MarketingPage() {
  return (
    <div className="marketing-page">
      <MarketingNavigation />
      <main id={MARKETING_MAIN_ID} tabIndex={-1}>
        <MarketingHero />
        <FeedbackJourney />
        <MarketingSections />
        <MarketingPricing />
        <MarketingFaq />
      </main>
      <MarketingFooter />
    </div>
  );
}
