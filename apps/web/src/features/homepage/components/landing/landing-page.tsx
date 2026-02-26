import Footer from "../footer";
import LandingBelowFold from "./landing-below-fold";
import LandingHero from "./landing-hero";
import LandingNavbar from "./landing-navbar";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingNavbar />
      <main className="flex-1">
        <LandingHero />
        <LandingBelowFold />
      </main>
      <Footer />
    </div>
  );
}
