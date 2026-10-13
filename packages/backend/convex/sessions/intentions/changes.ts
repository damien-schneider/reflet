import type { Doc } from "../../_generated/dataModel";

type Intention = Doc<"sessionProposals">;
type Change = Doc<"sessionContributions">["changes"][number];
export type ChangeInput = Pick<Change, "field" | "operation" | "value">;
export type AppliedField =
  Doc<"sessionContributions">["applied"][number]["fields"][number];
export type IntentionFieldName = AppliedField["field"];
type FieldValue = AppliedField["after"];

export interface IntentionValues {
  need: string;
  observed: string;
  response: string;
  setAside: string[];
  unknowns: string[];
}

const TEXT_FIELDS: ReadonlySet<IntentionFieldName> = new Set([
  "need",
  "observed",
  "response",
]);

export const isOperationAllowed = (
  field: IntentionFieldName,
  operation: Change["operation"]
): boolean => TEXT_FIELDS.has(field) === (operation === "replace");

export const valuesOf = (intention: Intention): IntentionValues => ({
  need: intention.need,
  observed: intention.observed,
  response: intention.response ?? "",
  setAside: intention.setAside,
  unknowns: intention.unknowns,
});

export const intentionPatchOf = (values: IntentionValues) => ({
  need: values.need,
  observed: values.observed,
  response: values.response === "" ? undefined : values.response,
  setAside: values.setAside,
  unknowns: values.unknowns,
});

const sameValue = (a: FieldValue, b: FieldValue): boolean =>
  typeof a === "string" || typeof b === "string"
    ? a === b
    : a.length === b.length && a.every((item, index) => item === b[index]);

const withField = (
  values: IntentionValues,
  field: IntentionFieldName,
  value: FieldValue
): IntentionValues =>
  field === "setAside" || field === "unknowns"
    ? { ...values, [field]: typeof value === "string" ? [value] : value }
    : {
        ...values,
        [field]: typeof value === "string" ? value : value.join(" "),
      };

const nextValue = (
  values: IntentionValues,
  change: ChangeInput
): FieldValue => {
  const current = values[change.field];
  if (typeof current === "string") {
    return change.value;
  }
  if (change.operation === "add") {
    return current.includes(change.value)
      ? current
      : [...current, change.value];
  }
  return current.filter((item) => item !== change.value);
};

export const applyChanges = (
  values: IntentionValues,
  changes: ChangeInput[]
): { fields: AppliedField[]; values: IntentionValues } => {
  let next = values;
  for (const change of changes) {
    next = withField(next, change.field, nextValue(next, change));
  }
  const touched = [...new Set(changes.map(({ field }) => field))];
  const fields = touched.flatMap((field) =>
    sameValue(values[field], next[field])
      ? []
      : [{ after: next[field], before: values[field], field }]
  );
  return { fields, values: next };
};

export const revertApplied = (
  values: IntentionValues,
  applied: Doc<"sessionContributions">["applied"]
): { changed: boolean; conflicted: boolean; values: IntentionValues } => {
  let next = values;
  let changed = false;
  let conflicted = false;
  for (const entry of [...applied].reverse()) {
    for (const field of entry.fields) {
      if (sameValue(next[field.field], field.after)) {
        next = withField(next, field.field, field.before);
        changed = true;
      } else {
        conflicted = true;
      }
    }
  }
  return { changed, conflicted, values: next };
};
