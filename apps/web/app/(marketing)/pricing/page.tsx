import Footer from "@/features/homepage/components/footer";
import Navbar from "@/features/homepage/components/navbar";
import Pricing from "@/features/homepage/components/pricing";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata = generatePageMetadata({
  description:
    "Simple, transparent pricing for teams of all sizes. Start free with a generous tier, or upgrade to Growth or Business for custom branding, API access, and priority support.",
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
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
