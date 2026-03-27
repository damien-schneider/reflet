"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

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
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getCookieConsent() === null) {
      setVisible(true);
    }
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
    <div className="fixed inset-x-0 bottom-0 z-50 p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-lg border border-border bg-background p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          We use cookies for analytics to improve your experience. See our{" "}
          <Link className="underline hover:text-foreground" href="/cookies">
            Cookie Policy
          </Link>{" "}
          for details.
        </p>
        <div className="flex shrink-0 gap-2">
          <Button onClick={handleReject} size="sm" variant="outline">
            Reject
          </Button>
          <Button onClick={handleAccept} size="sm">
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
