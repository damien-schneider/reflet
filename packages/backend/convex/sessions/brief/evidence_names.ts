import type { Doc, Id } from "../../_generated/dataModel";
import {
  elementLocators,
  elementSummary,
  formatClock,
  onPage,
  singleLine,
} from "../formatters";

export interface NamedEvidence {
  alias: string;
  doc: Doc<"sessionEvidence">;
  fileName: string | null;
}

export const nameEvidence = (
  chosen: { doc: Doc<"sessionEvidence">; sessionStartedAt: number }[]
): NamedEvidence[] =>
  [...chosen]
    .sort(
      (a, b) =>
        a.sessionStartedAt + a.doc.atMs - (b.sessionStartedAt + b.doc.atMs)
    )
    .map(({ doc }, index) => {
      const alias = `E${index + 1}`;
      const hasFile = doc.status === "available" && doc.image !== undefined;
      const fileName = hasFile
        ? `evidence/${alias}-${formatClock(doc.atMs).replace(":", "")}.png`
        : null;
      return { alias, doc, fileName };
    });

export const aliasOf = (
  named: NamedEvidence[],
  evidenceId: Id<"sessionEvidence">
): string | null =>
  named.find(({ doc }) => doc._id === evidenceId)?.alias ?? null;

const describeLink = ({ doc, alias }: NamedEvidence): string => {
  const link = doc.link;
  if (!link) {
    return `${alias} — link at ${formatClock(doc.atMs)}`;
  }
  return `${alias} — link "${singleLine(link.label)}" — ${singleLine(link.url)} — access: ${singleLine(link.access)}`;
};

export const describeEvidence = (named: NamedEvidence): string => {
  const { doc, alias, fileName } = named;
  if (doc.kind === "link") {
    return describeLink(named);
  }
  const parts = [
    `${alias} — screenshot at ${formatClock(doc.atMs)}${onPage(doc.frame?.url)}`,
  ];
  if (doc.element) {
    parts.push(
      `${elementSummary(doc.element)} (${elementLocators(doc.element)})`
    );
  }
  if (doc.note) {
    parts.push(`note: "${singleLine(doc.note)}"`);
  }
  parts.push(
    fileName
      ? `file ${fileName}`
      : `not captured: ${singleLine(doc.missingReason ?? "unavailable")}`
  );
  return parts.join(" — ");
};
