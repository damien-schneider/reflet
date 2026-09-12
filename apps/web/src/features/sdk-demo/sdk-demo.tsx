"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  ArrowDown,
  ArrowUpRight,
  CreditCard,
  Stack,
} from "@phosphor-icons/react";
import { useState } from "react";
import { RefletFeedback } from "reflet-sdk/feedback";

const INVOICES = [
  { amount: "€49.00", date: "Sep 1, 2026", id: "INV-2026-009" },
  { amount: "€49.00", date: "Aug 1, 2026", id: "INV-2026-008" },
  { amount: "€49.00", date: "Jul 1, 2026", id: "INV-2026-007" },
  { amount: "€49.00", date: "Jun 1, 2026", id: "INV-2026-006" },
];

function DemoSidebar() {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-border border-r bg-muted/20 p-6 md:flex">
      <div className="mb-12 flex items-center gap-3 font-semibold text-lg">
        <Stack size={24} weight="duotone" />
        Forma
      </div>
      <span className="mb-4 font-medium text-muted-foreground text-xs">
        WORKSPACE
      </span>
      <nav aria-label="Workspace" className="flex flex-col gap-2 text-sm">
        <a
          className="rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted"
          href="#overview"
        >
          Overview
        </a>
        <a
          className="rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted"
          href="#plan"
        >
          Your plan
        </a>
        <a
          aria-current="page"
          className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 font-medium"
          href="#invoices"
        >
          <CreditCard size={16} />
          Billing
        </a>
      </nav>
      <div className="mt-auto border-border border-t pt-5 text-xs">
        <p className="font-medium">Studio workspace</p>
        <p className="mt-1 text-muted-foreground">Pro plan · 3 members</p>
      </div>
    </aside>
  );
}

function BillingOverview() {
  const [showPlan, setShowPlan] = useState(false);
  return (
    <section className="grid gap-4 sm:grid-cols-2" id="plan">
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Current plan</span>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary text-xs">
            Active
          </span>
        </div>
        <div className="mt-5 flex items-baseline gap-2">
          <h2 className="font-semibold text-3xl tracking-tight">Pro</h2>
          <span className="text-muted-foreground text-sm">€49 / month</span>
        </div>
        <p className="mt-2 text-muted-foreground text-sm">
          Everything your studio needs to do its best work.
        </p>
        <Button
          className="mt-5"
          onClick={() => setShowPlan(!showPlan)}
          variant="surface"
        >
          {showPlan ? "Hide plan details" : "Manage plan"}
          <ArrowUpRight size={14} />
        </Button>
        {showPlan && (
          <p className="mt-4 text-muted-foreground text-sm">
            3 members, unlimited projects and 100 GB of storage. This workspace
            is a demo.
          </p>
        )}
      </div>
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <span className="text-muted-foreground text-sm">Payment method</span>
        <div className="mt-6 flex items-center gap-3">
          <span className="rounded-md border border-border px-3 py-2 font-semibold text-xs italic">
            VISA
          </span>
          <div>
            <p className="font-medium text-sm">Visa ending in 4242</p>
            <p className="mt-1 text-muted-foreground text-xs">
              Expires 08/2028
            </p>
          </div>
        </div>
        <p className="mt-6 text-muted-foreground text-sm">
          Your next invoice is on October 1, 2026.
        </p>
      </div>
    </section>
  );
}

function InvoiceHistory() {
  const [downloaded, setDownloaded] = useState<string | null>(null);
  return (
    <section className="mt-10" id="invoices">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-semibold text-lg tracking-tight">
          Invoice history
        </h2>
        <span className="text-muted-foreground text-xs">2026</span>
      </div>
      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {INVOICES.map((invoice) => (
          <div
            className="flex items-center gap-4 px-4 py-5 sm:px-6"
            key={invoice.id}
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">{invoice.date}</p>
              <p className="mt-1 text-muted-foreground text-xs">{invoice.id}</p>
            </div>
            <span className="hidden rounded-full bg-muted px-2.5 py-1 text-muted-foreground text-xs sm:inline-flex">
              Paid
            </span>
            <span className="text-right font-medium text-sm tabular-nums sm:w-28">
              {invoice.amount}
            </span>
            <Button
              aria-label={`Download ${invoice.id}`}
              iconOnly
              onClick={() => setDownloaded(invoice.id)}
              variant="ghost"
            >
              <ArrowDown size={18} />
            </Button>
          </div>
        ))}
      </div>
      {downloaded && (
        <p className="mt-3 text-muted-foreground text-sm" role="status">
          {downloaded} is a sample invoice. Downloads are available in a
          connected workspace.
        </p>
      )}
    </section>
  );
}

export function SdkDemo() {
  return (
    <div className="flex min-h-dvh bg-background text-foreground" id="overview">
      <DemoSidebar />
      <div className="min-w-0 flex-1">
        <header className="flex h-16 items-center justify-between border-border border-b px-6 sm:px-10">
          <span className="text-muted-foreground text-sm">
            <span className="hidden sm:inline">Workspace / </span>
            <span className="text-foreground">Billing</span>
          </span>
          <span className="rounded-full border border-border px-3 py-1 text-muted-foreground text-xs">
            SDK preview · no data sent
          </span>
        </header>
        <main className="mx-auto max-w-5xl px-6 pt-8 pb-64 sm:px-10 sm:pt-12">
          <div className="mb-8">
            <p className="mb-2 text-muted-foreground text-xs">
              STUDIO WORKSPACE
            </p>
            <h1 className="font-semibold text-3xl tracking-tight">
              Plans & billing
            </h1>
            <p className="mt-3 text-muted-foreground text-sm">
              Manage your subscription, payment details and invoices.
            </p>
          </div>
          <BillingOverview />
          <InvoiceHistory />
        </main>
      </div>
      <RefletFeedback
        baseUrl="/api/sdk-demo"
        dismissForDays={7}
        publicKey="fb_pub_demo"
        theme="auto"
      />
    </div>
  );
}
