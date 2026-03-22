// ============================================
// BILLING TYPES
// Shared types for billing components
// ============================================

export type BillingInterval = "monthly" | "yearly";
export type PlanTier = "free" | "pro";

export interface PlanPrice {
  amount: number;
  currency: string;
  interval: BillingInterval;
  priceKey: string;
  savings?: number;
}

export interface PlanFeature {
  highlight?: boolean;
  included: boolean;
  label: string;
}

export interface Plan {
  badge?: string;
  description: string;
  features: PlanFeature[];
  highlighted?: boolean;
  id: PlanTier;
  name: string;
  prices: PlanPrice[];
}

export interface SubscriptionData {
  cancelAt?: number;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number;
  priceId: string;
  status: string;
}

export interface UsageData {
  feedback: number;
  members: number;
}

export interface LimitsData {
  apiAccess: boolean;
  customBranding: boolean;
  customDomain: boolean;
  maxFeedback: number;
  maxMembers: number;
  prioritySupport: boolean;
}
