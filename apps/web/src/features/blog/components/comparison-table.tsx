import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ctrl-ui/react/ui/table";
import { Check, Minus, X } from "lucide-react";

import { H3 } from "@/components/ui/typography";

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

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === "yes") {
    return (
      <span className="flex items-center justify-center text-success-text">
        <Check className="h-5 w-5" />
      </span>
    );
  }
  if (value === "strong") {
    return (
      <span className="flex items-center justify-center text-success-text">
        <Check className="h-5 w-5 stroke-[3]" />
        <Check className="-ml-2 h-5 w-5 stroke-[3]" />
      </span>
    );
  }
  if (value === "no") {
    return (
      <span className="flex items-center justify-center text-destructive-text">
        <X className="h-5 w-5" />
      </span>
    );
  }
  if (value === "partial") {
    return (
      <span className="flex items-center justify-center text-warning-text">
        <Minus className="h-5 w-5" />
      </span>
    );
  }
  return <span className="text-center text-sm">{value}</span>;
}

export function ComparisonTable({
  competitorName,
  features,
}: ComparisonTableProps) {
  return (
    <div className="my-8 overflow-hidden rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted">
            <TableHead className="px-6 py-4 font-semibold">Feature</TableHead>
            <TableHead className="w-32 px-6 py-4 text-center font-semibold">
              <span className="flex items-center justify-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-brand font-bold text-brand-foreground text-caption">
                  R
                </span>
                Reflet
              </span>
            </TableHead>
            <TableHead className="w-32 px-6 py-4 text-center font-semibold">
              {competitorName}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {features.map((feature, index) => (
            <TableRow
              className={index % 2 === 0 ? "bg-card" : "bg-muted/30"}
              key={feature.name}
            >
              <TableCell className="whitespace-normal px-6 py-4">
                <div className="font-medium">{feature.name}</div>
                {feature.description && (
                  <div className="mt-1 text-muted-foreground text-sm">
                    {feature.description}
                  </div>
                )}
              </TableCell>
              <TableCell className="px-6 py-4">
                <FeatureCell value={feature.reflet} />
              </TableCell>
              <TableCell className="px-6 py-4">
                <FeatureCell value={feature.competitor} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface PricingComparisonProps {
  competitorName: string;
  competitorPricing: {
    free: string;
    paid: string;
    enterprise?: string;
  };
  refletPricing: {
    free: string;
    paid: string;
    enterprise?: string;
  };
}

export function PricingComparison({
  competitorName,
  refletPricing,
  competitorPricing,
}: PricingComparisonProps) {
  return (
    <div className="my-8">
      <H3 className="mb-4">Pricing Comparison</H3>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border-2 border-brand bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded bg-brand font-bold text-brand-foreground text-sm">
              R
            </span>
            <span className="font-semibold text-lg">Reflet</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Free tier</span>
              <span className="font-medium">{refletPricing.free}</span>
            </div>
            <div className="flex justify-between">
              <span>Paid plans</span>
              <span className="font-medium">{refletPricing.paid}</span>
            </div>
            {refletPricing.enterprise && (
              <div className="flex justify-between">
                <span>Enterprise</span>
                <span className="font-medium">{refletPricing.enterprise}</span>
              </div>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="font-semibold text-lg">{competitorName}</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Free tier</span>
              <span className="font-medium">{competitorPricing.free}</span>
            </div>
            <div className="flex justify-between">
              <span>Paid plans</span>
              <span className="font-medium">{competitorPricing.paid}</span>
            </div>
            {competitorPricing.enterprise && (
              <div className="flex justify-between">
                <span>Enterprise</span>
                <span className="font-medium">
                  {competitorPricing.enterprise}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
