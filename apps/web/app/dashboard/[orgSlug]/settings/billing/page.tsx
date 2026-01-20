"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { CreditCard, Sparkles } from "lucide-react";
import { use } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function BillingSettingsPage({
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

  const isAdmin =
    currentMember?.role === "admin" || currentMember?.role === "owner";

  if (!org) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="font-semibold text-xl">Organization not found</h2>
          <p className="mt-2 text-muted-foreground">
            The organization you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="font-bold text-2xl">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing details
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Current Plan
            </CardTitle>
            <CardDescription>
              You are currently on the free plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-muted/50 p-4">
              <h3 className="mb-2 font-semibold">Free Plan</h3>
              <ul className="space-y-1 text-muted-foreground text-sm">
                <li>• Unlimited feedback boards</li>
                <li>• Public roadmap and changelog</li>
                <li>• Up to 3 team members</li>
              </ul>
            </div>
          </CardContent>
        </Card>

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
              <p className="text-muted-foreground text-sm">
                Contact an admin to manage billing settings.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
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
                <Sparkles className="mr-2 h-4 w-4" />
                Upgrade to Pro
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
