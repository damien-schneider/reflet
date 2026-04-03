export const INSIGHT_STATUS_FILTERS = [
  "new",
  "reviewed",
  "dismissed",
  "converted_to_feedback",
] as const;

export type InsightStatusFilter = (typeof INSIGHT_STATUS_FILTERS)[number];

export const isInsightStatusFilter = (
  value: string
): value is InsightStatusFilter =>
  (INSIGHT_STATUS_FILTERS as readonly string[]).includes(value);

export const SIGNAL_TYPE_LABELS: Record<string, string> = {
  pain_point: "Pain Point",
  feature_request: "Feature Request",
  market_trend: "Market Trend",
  competitor_update: "Competitor Update",
};

export const SOURCE_LABELS: Record<string, string> = {
  reddit: "Reddit",
  web: "Web",
  hackernews: "Hacker News",
};
