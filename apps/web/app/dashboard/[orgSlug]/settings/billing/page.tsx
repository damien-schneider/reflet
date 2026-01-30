"use client";

import { ChartBar, CreditCard, Sparkle } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { use } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { H1, H2, H3, Muted, Text } from "@/components/ui/typography";

const FREE_PLAN_LIMITS = {
  teamMembers: 3,
} as const;

export default function BillingGearPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const currentMember = useQuery(
    api.members.getCurrentMember,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const members = useQuery(
    api.members.list,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );

  const isAdmin =
    currentMember?.role === "admin" || currentMember?.role === "owner";
  const isPro = org?.subscriptionTier === "pro";
  const memberCount = members?.length ?? 0;
  const memberPercentage = Math.min(
    (memberCount / FREE_PLAN_LIMITS.teamMembers) * 100,
    100
  );

  if (!org) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <H2 variant="card">Organization not found</H2>
          <Muted className="mt-2">
            The organization you&apos;re looking for doesn&apos;t exist.
          </Muted>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="mb-8">
        <div>
          <H1>Billing</H1>
          <Text variant="bodySmall">
            Manage your subscription and view usage
          </Text>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkle className="h-5 w-5" />
              Current Plan
            </CardTitle>
            <CardDescription>
              You are currently on the {isPro ? "Pro" : "Free"} plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-muted/50 p-4">
              <H3 className="mb-2" variant="card">
                {isPro ? "Pro Plan" : "Free Plan"}
              </H3>
              <ul className="space-y-1 text-muted-foreground text-sm">
                {isPro ? (
                  <>
                    <li>• Everything in Free</li>
                    <li>• Unlimited team members</li>
                    <li>• Custom branding</li>
                    <li>• Priority support</li>
                    <li>• Advanced analytics</li>
                  </>
                ) : (
                  <>
                    <li>• Unlimited feedback boards</li>
                    <li>• Public roadmap and changelog</li>
                    <li>• Up to 3 team members</li>
                  </>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>

        {!isPro && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartBar className="h-5 w-5" />
                Usage
              </CardTitle>
              <CardDescription>
                Track your current plan usage limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Progress value={memberPercentage}>
                  <ProgressLabel>Team members</ProgressLabel>
                  <ProgressValue>
                    {() => `${memberCount} / ${FREE_PLAN_LIMITS.teamMembers}`}
                  </ProgressValue>
                </Progress>
                {memberCount >= FREE_PLAN_LIMITS.teamMembers && (
                  <Text className="mt-2 text-amber-600" variant="bodySmall">
                    You&apos;ve reached your team member limit. Upgrade to Pro
                    for unlimited members.
                  </Text>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Method
            </CardTitle>
            <CardDescription>No payment method on file</CardDescription>
          </CardHeader>
          <CardContent>
            {isAdmin ? (
              <Button variant="outline">
                <CreditCard className="mr-2 h-4 w-4" />
                Add Payment Method
              </Button>
            ) : (
              <Text variant="bodySmall">
                Contact an admin to manage billing settings.
              </Text>
            )}
          </CardContent>
        </Card>

        {!isPro && (
          <Card className="border-olive-600/20 bg-olive-600/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkle className="h-5 w-5 text-olive-600" />
                Upgrade to Pro
              </CardTitle>
              <CardDescription>
                Get more features and unlimited team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="mb-4 space-y-1 text-muted-foreground text-sm">
                <li>• Everything in Free</li>
                <li>• Unlimited team members</li>
                <li>• Custom branding</li>
                <li>• Priority support</li>
                <li>• Advanced analytics</li>
              </ul>
              {isAdmin ? (
                <Button>
                  <Sparkle className="mr-2 h-4 w-4" />
                  Upgrade to Pro
                </Button>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
