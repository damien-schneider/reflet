import type { Doc } from "../_generated/dataModel";

const PRIORITY_SCORES = {
  critical: 400,
  high: 300,
  medium: 200,
  low: 100,
} as const;

const AGE_BOOST_PER_DAY_PCT = 0.05;
const INITIATIVE_COMPLETION_BOOST_PCT = 0.2;
const COST_EFFICIENCY_BONUS = 50;
const HIGH_COMPLETION_THRESHOLD = 0.6;
const LOW_BUDGET_THRESHOLD = 0.2;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type WorkItemDoc = Doc<"autopilotWorkItems">;
type ConfigDoc = Doc<"autopilotConfig">;

export const computeEffectivePriority = (
  workItem: WorkItemDoc,
  parentInitiative: WorkItemDoc | null,
  config: ConfigDoc | null
): number => {
  let score = 0;

  score +=
    PRIORITY_SCORES[workItem.priority as keyof typeof PRIORITY_SCORES] ??
    PRIORITY_SCORES.medium;

  if (
    parentInitiative &&
    (parentInitiative.completionPercent ?? 0) > HIGH_COMPLETION_THRESHOLD * 100
  ) {
    score += score * INITIATIVE_COMPLETION_BOOST_PCT;
  }

  const ageMs = Date.now() - workItem.createdAt;
  const ageDays = ageMs / MS_PER_DAY;
  score += score * AGE_BOOST_PER_DAY_PCT * ageDays;

  if (config) {
    const budgetUsedPct =
      config.dailyCostCapUsd && config.costUsedTodayUsd
        ? config.costUsedTodayUsd / config.dailyCostCapUsd
        : 0;

    const isBudgetLow = budgetUsedPct > 1 - LOW_BUDGET_THRESHOLD;

    if (isBudgetLow && workItem.priority === "low") {
      score += COST_EFFICIENCY_BONUS;
    }
  }

  return Math.round(score);
};
