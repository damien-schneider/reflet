"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CONSENT_KEY = "cookie-consent";

type ConsentValue = "accepted" | "rejected";

export function getCookieConsent(): ConsentValue | null {
  if (typeof window === "undefined") {
    return null;
  }
  const value = localStorage.getItem(CONSENT_KEY);
  if (value === "accepted" || value === "rejected") {
    return value;
  }
  return null;
}

export function hasAnalyticsConsent(): boolean {
  return getCookieConsent() === "accepted";
}

export function CookieConsentBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getCookieConsent() !== null) {
      return;
    }
    const reveal = () => setVisible(true);
    if (window.scrollY > 0) {
      reveal();
      return;
    }
    window.addEventListener("scroll", reveal, { once: true, passive: true });
    return () => window.removeEventListener("scroll", reveal);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
    window.location.reload();
  };

  const handleReject = () => {
    localStorage.setItem(CONSENT_KEY, "rejected");
    setVisible(false);
  };

  if (!visible) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-x-3 z-50 sm:right-3 sm:left-auto",
        pathname.startsWith("/dashboard") ? "bottom-28 sm:bottom-3" : "bottom-3"
      )}
    >
      <div className="flex max-w-sm flex-wrap items-center gap-2 rounded-lg border border-border bg-background p-2.5 shadow-sm">
        <p className="min-w-48 flex-1 text-muted-foreground text-sm">
          Allow analytics cookies?{" "}
          <Link className="underline hover:text-foreground" href="/cookies">
            Details
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button
            className="h-11 sm:h-8"
            onClick={handleReject}
            size="sm"
            variant="ghost"
          >
            Decline
          </Button>
          <Button className="h-11 sm:h-8" onClick={handleAccept} size="sm">
            Allow
          </Button>
        </div>
      </div>
    </div>
  );
}
