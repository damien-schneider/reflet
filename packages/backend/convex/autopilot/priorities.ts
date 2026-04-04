import type { Doc } from "../_generated/dataModel";

const PRIORITY_SCORES = {
  critical: 400,
  high: 300,
  medium: 200,
  low: 100,
} as const;

const PRESIDENT_DIRECTIVE_BOOST = 1000;
const AGE_BOOST_PER_DAY_PCT = 0.05;
const INITIATIVE_COMPLETION_BOOST_PCT = 0.2;
const SIGNAL_STRENGTH_MULTIPLIER = 10;
const COST_EFFICIENCY_BONUS = 50;
const HIGH_COMPLETION_THRESHOLD = 0.6;
const LOW_BUDGET_THRESHOLD = 0.2;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type TaskDoc = Doc<"autopilotTasks">;
type InitiativeDoc = Doc<"autopilotInitiatives">;
type SignalDoc = Doc<"autopilotNotes">;
type ConfigDoc = Doc<"autopilotConfig">;

export const computeEffectivePriority = (
  task: TaskDoc,
  initiative: InitiativeDoc | null,
  signals: SignalDoc[],
  config: ConfigDoc | null
): number => {
  let score = 0;

  if (task.origin === "user_created" && task.priority === "critical") {
    score += PRESIDENT_DIRECTIVE_BOOST;
  }

  score +=
    PRIORITY_SCORES[task.priority as keyof typeof PRIORITY_SCORES] ??
    PRIORITY_SCORES.medium;

  if (
    initiative &&
    initiative.completionPercent > HIGH_COMPLETION_THRESHOLD * 100
  ) {
    score += score * INITIATIVE_COMPLETION_BOOST_PCT;
  }

  const ageMs = Date.now() - task.createdAt;
  const ageDays = ageMs / MS_PER_DAY;
  score += score * AGE_BOOST_PER_DAY_PCT * ageDays;

  const linkedSignals = signals.filter(
    (s) =>
      s.linkedInitiativeId &&
      initiative &&
      s.linkedInitiativeId === initiative._id
  );

  for (const signal of linkedSignals) {
    score += signal.strength * SIGNAL_STRENGTH_MULTIPLIER;
  }

  if (config) {
    const budgetUsedPct =
      config.dailyCostCapUsd && config.costUsedTodayUsd
        ? config.costUsedTodayUsd / config.dailyCostCapUsd
        : 0;

    const isBudgetLow = budgetUsedPct > 1 - LOW_BUDGET_THRESHOLD;
    const isCheapTask =
      task.estimatedCostUsd !== undefined && task.estimatedCostUsd < 0.1;

    if (isBudgetLow && isCheapTask) {
      score += COST_EFFICIENCY_BONUS;
    }
  }

  return Math.round(score);
};
