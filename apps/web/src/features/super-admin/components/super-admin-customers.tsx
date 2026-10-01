"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ctrl-ui/react/ui/table";
import {
  ArrowUpRight,
  CalendarX,
  CurrencyEur,
  UsersThree,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { PLANS } from "@/features/project/components/billing/billing-config";
import { StatCard } from "./stat-card";
import { SubscriptionStatusBadge } from "./subscription-status-badge";
import {
  AdminDate,
  EmptyTableRow,
  SuperAdminTableSkeleton,
} from "./super-admin-table";

type Customer = FunctionReturnType<
  typeof api.organizations.super_admin_customers.listCustomers
>[number];

const STRIPE_CUSTOMER_URL = "https://dashboard.stripe.com/customers/";
const PRO_PRICES = PLANS.find((plan) => plan.id === "pro")?.prices ?? [];

const isPaying = (customer: Customer) =>
  customer.subscription?.status === "active" ||
  customer.subscription?.status === "trialing";

const monthlyRevenueOf = (customer: Customer) => {
  const interval = customer.subscription?.billingInterval;
  const price = PRO_PRICES.find((candidate) => candidate.interval === interval);
  if (!(price && isPaying(customer))) {
    return 0;
  }
  return interval === "yearly" ? price.amount / 12 : price.amount;
};

function ExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="inline-flex items-center gap-0.5 text-foreground underline-offset-4 hover:underline"
      href={href}
      rel="noopener"
      target="_blank"
    >
      {label}
      <ArrowUpRight aria-hidden className="size-3" />
    </Link>
  );
}

function PlanCell({ customer }: { customer: Customer }) {
  const { subscription } = customer;
  if (!subscription) {
    return <Badge color="neutral">Checkout only</Badge>;
  }
  const endsLabel = subscription.cancelAtPeriodEnd ? "Ends" : "Renews";
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-1.5">
        <SubscriptionStatusBadge status={subscription.status} />
        <span className="text-muted-foreground text-xs capitalize">
          {subscription.billingInterval}
        </span>
      </div>
      <span className="text-muted-foreground text-xs">
        {endsLabel} <AdminDate timestamp={subscription.currentPeriodEnd} />
      </span>
    </div>
  );
}

function CustomerRow({ customer }: { customer: Customer }) {
  const { owner, usage } = customer;
  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{customer.name}</span>
          <span className="text-muted-foreground text-xs">
            {customer.slug}
            {customer.isPublic ? "" : " · private"}
          </span>
        </div>
      </TableCell>
      <TableCell>
        {owner ? (
          <div className="flex flex-col">
            <span>{owner.name}</span>
            <a
              className="text-muted-foreground text-xs underline-offset-4 hover:underline"
              href={`mailto:${owner.email}`}
            >
              {owner.email}
            </a>
          </div>
        ) : (
          <span className="text-muted-foreground">No owner</span>
        )}
      </TableCell>
      <TableCell>
        <PlanCell customer={customer} />
      </TableCell>
      <TableCell className="text-muted-foreground text-xs tabular-nums">
        <div>
          {usage.members} members · {usage.feedback} feedback
        </div>
        <div>
          {usage.publishedReleases} releases · {usage.monitors} monitors
          {usage.githubConnected ? " · GitHub" : ""}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        <div>
          Activity <AdminDate timestamp={usage.lastActivityAt} />
        </div>
        <div>
          Feedback <AdminDate timestamp={usage.lastFeedbackAt} />
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col items-start gap-0.5 text-sm">
          <ExternalLink href={`/${customer.slug}`} label="Board" />
          {customer.customDomain ? (
            <ExternalLink
              href={`https://${customer.customDomain}`}
              label={customer.customDomain}
            />
          ) : null}
          {customer.stripeCustomerId ? (
            <ExternalLink
              href={`${STRIPE_CUSTOMER_URL}${customer.stripeCustomerId}`}
              label="Stripe"
            />
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function SuperAdminCustomers() {
  const customers = useQuery(
    api.organizations.super_admin_customers.listCustomers
  );

  if (customers === undefined) {
    return <SuperAdminTableSkeleton label="Loading customers…" />;
  }

  const payingFirst = [...customers].sort(
    (a, b) =>
      Number(isPaying(b)) - Number(isPaying(a)) ||
      (b.subscription?.currentPeriodEnd ?? 0) -
        (a.subscription?.currentPeriodEnd ?? 0)
  );
  const payingCount = customers.filter(isPaying).length;
  const monthlyRevenue = customers.reduce(
    (total, customer) => total + monthlyRevenueOf(customer),
    0
  );
  const cancellingCount = customers.filter(
    (customer) => isPaying(customer) && customer.subscription?.cancelAtPeriodEnd
  ).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={UsersThree} label="Paying orgs" value={payingCount} />
        <StatCard icon={CurrencyEur} label="MRR (€)" value={monthlyRevenue} />
        <StatCard
          icon={CalendarX}
          label="Cancelling at period end"
          value={cancellingCount}
        />
      </div>

      <div className="rounded-(--radius-panel) border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Last seen</TableHead>
              <TableHead>Links</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payingFirst.length === 0 ? (
              <EmptyTableRow colSpan={6} message="No customers yet." />
            ) : (
              payingFirst.map((customer) => (
                <CustomerRow customer={customer} key={customer._id} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
