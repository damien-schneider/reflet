import type { BillingInterval } from "./billing-types";

export function BillingToggle({
  interval,
  onChange,
  yearlySavings,
}: {
  interval: BillingInterval;
  onChange: (interval: BillingInterval) => void;
  yearlySavings?: number;
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      <button
        className={`rounded-full px-4 py-1.5 font-medium text-sm transition-colors ${
          interval === "monthly"
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground"
        }`}
        onClick={() => onChange("monthly")}
        type="button"
      >
        Monthly
      </button>
      <button
        className={`rounded-full px-4 py-1.5 font-medium text-sm transition-colors ${
          interval === "yearly"
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground"
        }`}
        onClick={() => onChange("yearly")}
        type="button"
      >
        Yearly
        {yearlySavings && (
          <span className="ml-1.5 text-green-500">(Save €{yearlySavings})</span>
        )}
      </button>
    </div>
  );
}
