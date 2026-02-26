import type { Plan } from "./billing-types";

// ============================================
// PLAN CONFIGURATION
// Extensible structure for future plans
// ============================================

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    description: "For individuals and small teams getting started",
    prices: [{ amount: 0, currency: "€", interval: "monthly", priceKey: "" }],
    features: [
      { label: "Up to 3 team members", included: true },
      { label: "100 feedback items", included: true },
      { label: "Public roadmap & changelog", included: true },
      { label: "Logo upload", included: true },
      { label: "Custom domains", included: false },
      { label: "Custom colors & styling", included: false },
      { label: "API access", included: false },
      { label: "Priority support", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For growing teams that need more power",
    badge: "Most Popular",
    highlighted: true,
    prices: [
      {
        amount: 15,
        currency: "€",
        interval: "monthly",
        priceKey: "proMonthly",
      },
      {
        amount: 150,
        currency: "€",
        interval: "yearly",
        priceKey: "proYearly",
        savings: 30,
      },
    ],
    features: [
      { label: "Unlimited team members", included: true, highlight: true },
      { label: "5,000 feedback items", included: true, highlight: true },
      { label: "Public roadmap & changelog", included: true },
      { label: "Logo upload", included: true },
      { label: "Custom domains", included: true, highlight: true },
      { label: "Custom colors & styling", included: true, highlight: true },
      { label: "API access", included: true },
      { label: "Priority support", included: true },
    ],
  },
];

export const DEFAULT_LIMITS: import("./billing-types").LimitsData = {
  maxMembers: 3,
  maxFeedback: 100,
  customBranding: false,
  customDomain: false,
  apiAccess: false,
  prioritySupport: false,
};
