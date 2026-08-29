import type { Metadata } from "next";
import type { ReactNode } from "react";

import HeroSwitcher from "@/features/homepage/components/landing/heroes/hero-switcher";
import Navbar from "@/features/homepage/components/navbar";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Hero proposals",
};

export default function HeroesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh bg-background">
      <div className="fixed inset-x-0 top-0 z-50">
        <Navbar />
      </div>
      {children}
      <HeroSwitcher />
    </div>
  );
}
