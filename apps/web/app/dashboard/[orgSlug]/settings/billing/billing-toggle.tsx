import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      <Tabs
        onValueChange={(value) => onChange(value as BillingInterval)}
        value={interval}
      >
        <TabsList className="h-10">
          <TabsTrigger className="h-8 px-4" value="monthly">
            Monthly
          </TabsTrigger>
          <TabsTrigger className="h-8 px-4" value="yearly">
            Yearly
            {yearlySavings ? (
              <span className="ml-1.5 text-green-500">
                (Save €{yearlySavings})
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
