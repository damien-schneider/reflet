type AnswerValue = string | number | boolean | string[];

function computeNumericDistribution(
  answers: Array<{ value: AnswerValue }>
): Array<{ label: string; count: number }> {
  const numericValues = answers
    .map((a) => a.value)
    .filter((v): v is number => typeof v === "number");

  const counts = new Map<string, number>();
  for (const val of numericValues) {
    const key = String(val);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ count, label }))
    .sort((a, b) => Number(a.label) - Number(b.label));
}

function computeChoiceDistribution(
  answers: Array<{ value: AnswerValue }>
): Array<{ label: string; count: number }> {
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
    .map(([label, count]) => ({ count, label }))
    .sort((a, b) => b.count - a.count);
}

function computeBooleanDistribution(
  answers: Array<{ value: AnswerValue }>
): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const answer of answers) {
    const key = String(answer.value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([label, count]) => ({
    count,
    label,
  }));
}

export function computeDistribution(
  question: { type: string },
  answers: Array<{ value: AnswerValue }>
): Array<{ label: string; count: number }> | undefined {
  if (question.type === "rating" || question.type === "nps") {
    return computeNumericDistribution(answers);
  }
  if (
    question.type === "single_choice" ||
    question.type === "multiple_choice"
  ) {
    return computeChoiceDistribution(answers);
  }
  if (question.type === "boolean") {
    return computeBooleanDistribution(answers);
  }
}

export function computeAverage(
  question: { type: string },
  answers: Array<{ value: AnswerValue }>
): number | undefined {
  if (question.type !== "rating" && question.type !== "nps") {
    return;
  }

  const numericValues = answers
    .map((a) => a.value)
    .filter((v): v is number => typeof v === "number");

  if (numericValues.length === 0) {
    return;
  }

  return (
    Math.round(
      (numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length) * 10
    ) / 10
  );
}
