import { CheckoutLink, CustomerPortalLink } from "@convex-dev/polar/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { PLAN_LIMITS } from "@reflet-v2/backend/convex/organizations";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
  Check,
  ExternalLink,
  Layout,
  MessageSquare,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/dashboard/$orgSlug/settings/billing")({
  component: BillingSettingsPage,
});

function BillingSettingsPage() {
  const { orgSlug } = Route.useParams();
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const subscription = useQuery(
    api.subscriptions.getStatus,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const members = useQuery(
    api.members.list,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const boards = useQuery(
    api.boards.list,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  // Get products from Polar component
  const products = useQuery(api.polar.getConfiguredProducts);

  if (!org) {
    return <div>Loading...</div>;
  }

  const isActive = subscription?.status === "active";
  const currentPlan = isActive ? "Pro" : "Free";
  const limits = isActive ? PLAN_LIMITS.pro : PLAN_LIMITS.free;

  const memberCount = members?.length ?? 0;
  const boardCount = boards?.length ?? 0;
  const canManage = subscription?.isOwner ?? false;

  // Get product IDs for checkout
  const proMonthlyId = products?.proMonthly?.id;
  const proYearlyId = products?.proYearly?.id;
  const productIds = [proMonthlyId, proYearlyId].filter((id): id is string =>
    Boolean(id)
  );

  const plans = [
    {
      name: "Free",
      price: "$0",
      description: "For individuals and small projects",
      features: [
        `${PLAN_LIMITS.free.maxBoards} board`,
        `${PLAN_LIMITS.free.maxMembers} team members`,
        `${PLAN_LIMITS.free.maxFeedbackPerBoard} feedback items per board`,
        "Basic roadmap",
        "Public & private boards",
      ],
      limits: PLAN_LIMITS.free,
    },
    {
      name: "Pro",
      price: products?.proMonthly?.prices?.[0]?.priceAmount
        ? `$${(products.proMonthly.prices[0].priceAmount / 100).toFixed(0)}`
        : "$19",
      description: "For growing teams and products",
      features: [
        `${PLAN_LIMITS.pro.maxBoards} boards`,
        `${PLAN_LIMITS.pro.maxMembers} team members`,
        `${PLAN_LIMITS.pro.maxFeedbackPerBoard} feedback items per board`,
        "Advanced roadmap",
        "Public & private boards",
        "Custom branding",
        "Priority support",
      ],
      limits: PLAN_LIMITS.pro,
      popular: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Current subscription */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            You are currently on the <strong>{currentPlan}</strong> plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-sm">Members</p>
                <p className="font-semibold">
                  {memberCount} / {limits.maxMembers}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <Layout className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-sm">Boards</p>
                <p className="font-semibold">
                  {boardCount} / {limits.maxBoards}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-sm">Feedback/Board</p>
                <p className="font-semibold">{limits.maxFeedbackPerBoard}</p>
              </div>
            </div>
          </div>

          {isActive && canManage && (
            <div className="mt-4">
              <CustomerPortalLink polarApi={api.polar}>
                <Button variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Manage subscription
                </Button>
              </CustomerPortalLink>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans comparison */}
      <div>
        <h2 className="mb-4 font-semibold text-lg">Plans</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => {
            const isCurrentPlan = plan.name === currentPlan;
            let actionButton: React.ReactNode;

            if (isCurrentPlan) {
              actionButton = (
                <Button className="w-full" disabled variant="outline">
                  Current Plan
                </Button>
              );
            } else if (plan.name === "Pro" && productIds.length > 0) {
              actionButton = (
                <CheckoutLink
                  className="w-full"
                  embed={false}
                  polarApi={api.polar}
                  productIds={productIds}
                >
                  <Button className="w-full" disabled={!canManage}>
                    Upgrade to Pro
                  </Button>
                </CheckoutLink>
              );
            } else if (plan.name === "Free" && isActive && canManage) {
              actionButton = (
                <CustomerPortalLink polarApi={api.polar}>
                  <Button
                    className="w-full"
                    disabled={!canManage}
                    variant="outline"
                  >
                    Downgrade
                  </Button>
                </CustomerPortalLink>
              );
            } else {
              actionButton = (
                <Button className="w-full" disabled variant="outline">
                  {plan.name === "Pro" ? "Upgrade to Pro" : "Downgrade"}
                </Button>
              );
            }

            return (
              <Card
                className={
                  plan.popular ? "border-primary ring-1 ring-primary" : ""
                }
                key={plan.name}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    {plan.popular && <Badge>Most Popular</Badge>}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-2">
                    <span className="font-bold text-3xl">{plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li className="flex items-center gap-2" key={feature}>
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">{actionButton}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium">Can I cancel anytime?</h4>
            <p className="text-muted-foreground text-sm">
              Yes, you can cancel your subscription at any time. You'll continue
              to have access until the end of your billing period.
            </p>
          </div>
          <div>
            <h4 className="font-medium">
              What happens to my data if I downgrade?
            </h4>
            <p className="text-muted-foreground text-sm">
              Your data will be preserved, but you won't be able to create new
              boards or invite members beyond the Free plan limits.
            </p>
          </div>
          <div>
            <h4 className="font-medium">Do you offer refunds?</h4>
            <p className="text-muted-foreground text-sm">
              We offer a 14-day money-back guarantee. Contact support for
              assistance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
