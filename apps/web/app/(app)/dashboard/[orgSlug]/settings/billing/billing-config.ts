import type { Plan } from "./billing-types";

// ============================================
// PLAN CONFIGURATION
// Extensible structure for future plans
// ============================================

export const PLANS: Plan[] = [
  {
    description: "For individuals and small teams getting started",
    features: [
      { included: true, label: "Up to 3 team members" },
      { included: true, label: "100 feedback items" },
      { included: true, label: "Public roadmap & changelog" },
      { included: true, label: "Logo upload" },
      { included: false, label: "Custom domains" },
      { included: false, label: "Custom colors & styling" },
      { included: false, label: "API access" },
      { included: false, label: "Priority support" },
    ],
    id: "free",
    name: "Free",
    prices: [{ amount: 0, currency: "€", interval: "monthly", priceKey: "" }],
  },
  {
    badge: "Most Popular",
    description: "For growing teams that need more power",
    features: [
      { highlight: true, included: true, label: "Unlimited team members" },
      { highlight: true, included: true, label: "5,000 feedback items" },
      { included: true, label: "Public roadmap & changelog" },
      { included: true, label: "Logo upload" },
      { highlight: true, included: true, label: "Custom domains" },
      { highlight: true, included: true, label: "Custom colors & styling" },
      { included: true, label: "API access" },
      { included: true, label: "Priority support" },
    ],
    highlighted: true,
    id: "pro",
    name: "Pro",
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
  },
];

export const DEFAULT_LIMITS: import("./billing-types").LimitsData = {
  apiAccess: false,
  customBranding: false,
  customDomain: false,
  maxFeedback: 100,
  maxMembers: 3,
  prioritySupport: false,
};
