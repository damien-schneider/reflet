import { Check, Minus, X } from "lucide-react";

import { H3 } from "@/components/ui/typography";

type FeatureValue = "yes" | "no" | "partial" | "strong" | string;

interface Feature {
  name: string;
  reflet: FeatureValue;
  competitor: FeatureValue;
  description?: string;
}

interface ComparisonTableProps {
  competitorName: string;
  competitorLogo?: string;
  features: Feature[];
}

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === "yes") {
    return (
      <span className="flex items-center justify-center text-emerald-600">
        <Check className="h-5 w-5" />
      </span>
    );
  }
  if (value === "strong") {
    return (
      <span className="flex items-center justify-center text-emerald-600">
        <Check className="h-5 w-5 stroke-[3]" />
        <Check className="-ml-2 h-5 w-5 stroke-[3]" />
      </span>
    );
  }
  if (value === "no") {
    return (
      <span className="flex items-center justify-center text-red-500">
        <X className="h-5 w-5" />
      </span>
    );
  }
  if (value === "partial") {
    return (
      <span className="flex items-center justify-center text-amber-500">
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
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted">
              <th className="px-6 py-4 text-left font-semibold">Feature</th>
              <th className="w-32 px-6 py-4 text-center font-semibold">
                <span className="flex items-center justify-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-olive-600 font-bold text-[10px] text-olive-100">
                    R
                  </span>
                  Reflet
                </span>
              </th>
              <th className="w-32 px-6 py-4 text-center font-semibold">
                {competitorName}
              </th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature, index) => (
              <tr
                className={index % 2 === 0 ? "bg-card" : "bg-muted/30"}
                key={feature.name}
              >
                <td className="px-6 py-4">
                  <div className="font-medium">{feature.name}</div>
                  {feature.description && (
                    <div className="mt-1 text-muted-foreground text-sm">
                      {feature.description}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <FeatureCell value={feature.reflet} />
                </td>
                <td className="px-6 py-4">
                  <FeatureCell value={feature.competitor} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface PricingComparisonProps {
  competitorName: string;
  refletPricing: {
    free: string;
    paid: string;
    enterprise?: string;
  };
  competitorPricing: {
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
        <div className="rounded-xl border-2 border-olive-600 bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded bg-olive-600 font-bold text-olive-100 text-sm">
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
