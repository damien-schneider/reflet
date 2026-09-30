import { Tabs, TabsList, TabsTab } from "@ctrl-ui/react/ui/tabs";

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
    <Tabs
      onValueChange={(value) => {
        if (value === "monthly" || value === "yearly") {
          onChange(value);
        }
      }}
      value={interval}
    >
      <TabsList aria-label="Billing interval" size="md">
        <TabsTab value="monthly">Monthly</TabsTab>
        <TabsTab value="yearly">
          Yearly
          {yearlySavings ? (
            <span className="text-success-text tabular-nums">
              Save €{yearlySavings}
            </span>
          ) : null}
        </TabsTab>
      </TabsList>
    </Tabs>
  );
}
