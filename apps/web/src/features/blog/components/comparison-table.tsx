import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ctrl-ui/react/ui/table";
import { Check, CheckCheck, Minus, X } from "lucide-react";

import { cn } from "@/lib/utils";

type FeatureValue = "yes" | "no" | "partial" | "strong" | string;

interface Feature {
  competitor: FeatureValue;
  description?: string;
  name: string;
  reflet: FeatureValue;
}

interface ComparisonTableProps {
  competitorName: string;
  features: Feature[];
}

const FEATURE_MARKS = {
  no: { icon: X, label: "No", tone: "text-muted-foreground" },
  partial: { icon: Minus, label: "Partial", tone: "text-warning-text" },
  strong: {
    icon: CheckCheck,
    label: "Yes, a strength",
    tone: "text-success-text",
  },
  yes: { icon: Check, label: "Yes", tone: "text-success-text" },
} as const;

function isMarkedValue(
  value: FeatureValue
): value is keyof typeof FEATURE_MARKS {
  return value in FEATURE_MARKS;
}

function FeatureCell({ value }: { value: FeatureValue }) {
  if (!isMarkedValue(value)) {
    return <span className="text-body">{value}</span>;
  }
  const { icon: Icon, label, tone } = FEATURE_MARKS[value];
  return (
    <span className={cn("inline-flex justify-center", tone)}>
      <Icon aria-hidden="true" className="size-5" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function ComparisonTable({
  competitorName,
  features,
}: ComparisonTableProps) {
  return (
    <div className="my-8 overflow-x-auto tabular-nums">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Feature</TableHead>
            <TableHead className="w-32 text-center">Reflet</TableHead>
            <TableHead className="w-32 text-center">{competitorName}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {features.map((feature) => (
            <TableRow key={feature.name}>
              <TableCell className="whitespace-normal">
                <span className="block font-medium text-foreground">
                  {feature.name}
                </span>
                {feature.description ? (
                  <span className="mt-1 block text-muted-foreground">
                    {feature.description}
                  </span>
                ) : null}
              </TableCell>
              <TableCell className="text-center">
                <FeatureCell value={feature.reflet} />
              </TableCell>
              <TableCell className="text-center">
                <FeatureCell value={feature.competitor} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface PlanPricing {
  enterprise?: string;
  free: string;
  paid: string;
}

interface PricingComparisonProps {
  competitorName: string;
  competitorPricing: PlanPricing;
  refletPricing: PlanPricing;
}

function PricingCard({
  highlighted,
  name,
  pricing,
}: {
  highlighted?: boolean;
  name: string;
  pricing: PlanPricing;
}) {
  const rows = [
    { label: "Free tier", value: pricing.free },
    { label: "Paid plans", value: pricing.paid },
    ...(pricing.enterprise
      ? [{ label: "Enterprise", value: pricing.enterprise }]
      : []),
  ];

  return (
    <div
      className={cn(
        "rounded-(--radius-panel) p-6",
        highlighted
          ? "bg-card shadow-(--marketing-float-shadow)"
          : "bg-secondary"
      )}
    >
      <p className="mb-4 text-foreground text-heading-3">{name}</p>
      <dl className="space-y-2 text-body">
        {rows.map((row) => (
          <div className="flex justify-between gap-4" key={row.label}>
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="text-end font-medium text-foreground tabular-nums">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function PricingComparison({
  competitorName,
  refletPricing,
  competitorPricing,
}: PricingComparisonProps) {
  return (
    <section className="my-8">
      <h3 className="mb-4 text-foreground text-heading-3">
        Pricing comparison
      </h3>
      <div className="grid gap-4 md:grid-cols-2">
        <PricingCard highlighted name="Reflet" pricing={refletPricing} />
        <PricingCard name={competitorName} pricing={competitorPricing} />
      </div>
    </section>
  );
}
