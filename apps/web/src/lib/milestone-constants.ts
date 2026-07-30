export const TIME_HORIZONS = [
  "now",
  "next_month",
  "next_quarter",
  "half_year",
  "next_year",
  "future",
] as const;

export type TimeHorizon = (typeof TIME_HORIZONS)[number];

export function isTimeHorizon(value: string): value is TimeHorizon {
  return TIME_HORIZONS.some((h) => h === value);
}

export const TIME_HORIZON_CONFIG: Record<
  TimeHorizon,
  { label: string; shortLabel: string; description: string }
> = {
  future: {
    description: "Someday / on the horizon",
    label: "Future",
    shortLabel: "Future",
  },
  half_year: {
    description: "Coming in ~6 months",
    label: "6 Months",
    shortLabel: "6mo",
  },
  next_month: {
    description: "Coming in ~1 month",
    label: "Next Month",
    shortLabel: "1mo",
  },
  next_quarter: {
    description: "Coming in ~3 months",
    label: "Next Quarter",
    shortLabel: "3mo",
  },
  next_year: {
    description: "Coming next year",
    label: "Next Year",
    shortLabel: "1yr",
  },
  now: {
    description: "Currently in progress",
    label: "Now",
    shortLabel: "Now",
  },
};
