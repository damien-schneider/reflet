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
  label: string;
  included: boolean;
  highlight?: boolean;
}

export interface Plan {
  id: PlanTier;
  name: string;
  description: string;
  prices: PlanPrice[];
  features: PlanFeature[];
  badge?: string;
  highlighted?: boolean;
}

export interface SubscriptionData {
  priceId: string;
  status: string;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  cancelAt?: number;
}

export interface UsageData {
  members: number;
  feedback: number;
}

export interface LimitsData {
  maxMembers: number;
  maxFeedback: number;
  customBranding: boolean;
  customDomain: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
}
