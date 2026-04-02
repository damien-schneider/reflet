interface DistEntry {
  count: number;
  label: string;
}

type AnswerValue = string | number | boolean | string[];

export function computeNumericStats(answers: Array<{ value: AnswerValue }>): {
  averageValue?: number;
  distribution: DistEntry[];
} {
  const numericValues = answers
    .map((a) => a.value)
    .filter((v): v is number => typeof v === "number");

  const averageValue =
    numericValues.length > 0
      ? Math.round(
          (numericValues.reduce((sum, v) => sum + v, 0) /
            numericValues.length) *
            10
        ) / 10
      : undefined;

  const counts = new Map<string, number>();
  for (const val of numericValues) {
    const key = String(val);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const distribution = Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => Number(a.label) - Number(b.label));

  return { averageValue, distribution };
}

export function computeChoiceStats(
  answers: Array<{ value: AnswerValue }>
): DistEntry[] {
  const counts = new Map<string, number>();
  for (const answer of answers) {
    const val = answer.value;
    if (typeof val === "string") {
      counts.set(val, (counts.get(val) ?? 0) + 1);
    } else if (Array.isArray(val)) {
      for (const v of val) {
        if (typeof v === "string") {
          counts.set(v, (counts.get(v) ?? 0) + 1);
        }
      }
    }
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export function computeBooleanStats(
  answers: Array<{ value: AnswerValue }>
): DistEntry[] {
  const counts = new Map<string, number>();
  for (const answer of answers) {
    const key = String(answer.value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([label, count]) => ({
    label,
    count,
  }));
}
