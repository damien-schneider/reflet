export const CONSENT_KEY = "cookie-consent";

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
