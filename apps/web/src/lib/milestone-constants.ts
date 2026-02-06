export const TIME_HORIZONS = [
  "now",
  "next_month",
  "next_quarter",
  "half_year",
  "next_year",
  "future",
] as const;

export type TimeHorizon = (typeof TIME_HORIZONS)[number];

export const TIME_HORIZON_CONFIG: Record<
  TimeHorizon,
  { label: string; shortLabel: string; description: string }
> = {
  now: {
    label: "Now",
    shortLabel: "Now",
    description: "Currently in progress",
  },
  next_month: {
    label: "Next Month",
    shortLabel: "1mo",
    description: "Coming in ~1 month",
  },
  next_quarter: {
    label: "Next Quarter",
    shortLabel: "3mo",
    description: "Coming in ~3 months",
  },
  half_year: {
    label: "6 Months",
    shortLabel: "6mo",
    description: "Coming in ~6 months",
  },
  next_year: {
    label: "Next Year",
    shortLabel: "1yr",
    description: "Coming next year",
  },
  future: {
    label: "Future",
    shortLabel: "Future",
    description: "Someday / on the horizon",
  },
};
