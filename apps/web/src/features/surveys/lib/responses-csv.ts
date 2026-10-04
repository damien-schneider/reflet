import type { api } from "@reflet/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import {
  formatAnswerValue,
  RESPONSE_CHANNEL_LABELS,
  RESPONSE_STATUS_LABELS,
} from "@/features/surveys/lib/response-labels";

export type ResponsesExport = FunctionReturnType<
  typeof api.surveys.queries.exportResponses
>;

type ExportRow = ResponsesExport["rows"][number];

const CHARACTERS_NEEDING_QUOTES = /[",\r\n]/;
const SPREADSHEET_FORMULA_START = /^[=+\-@\t\r]/;
const CSV_LINE_BREAK = "\r\n";

const RESPONSE_COLUMNS: ReadonlyArray<{
  header: string;
  cell: (row: ExportRow, endingTitles: ReadonlyMap<string, string>) => string;
}> = [
  { cell: (row) => row.responseId, header: "Response ID" },
  { cell: (row) => RESPONSE_STATUS_LABELS[row.status], header: "Status" },
  { cell: (row) => RESPONSE_CHANNEL_LABELS[row.channel], header: "Channel" },
  {
    cell: (row) => new Date(row.startedAt).toISOString(),
    header: "Started at",
  },
  {
    cell: (row) =>
      row.completedAt === undefined
        ? ""
        : new Date(row.completedAt).toISOString(),
    header: "Completed at",
  },
  {
    cell: (row, endingTitles) =>
      row.endingId === undefined
        ? ""
        : (endingTitles.get(row.endingId) ?? row.endingId),
    header: "Ending",
  },
  { cell: (row) => row.pageUrl ?? "", header: "Page URL" },
  { cell: (row) => row.respondentId ?? "", header: "Respondent ID" },
  { cell: (row) => row.respondentName ?? "", header: "Respondent name" },
  { cell: (row) => row.respondentEmail ?? "", header: "Respondent email" },
];

/** Respondent text starting like a formula would run in Excel/Sheets; the `'` keeps it plain text. */
const quoteCsvField = (field: string): string => {
  const inert = SPREADSHEET_FORMULA_START.test(field) ? `'${field}` : field;
  return CHARACTERS_NEEDING_QUOTES.test(inert)
    ? `"${inert.replaceAll('"', '""')}"`
    : inert;
};

const uniqueHeaders = (
  fixedHeaders: readonly string[],
  questionTitles: readonly string[]
): string[] => {
  const usedHeaders = new Set(fixedHeaders);
  const questionHeaders = questionTitles.map((title) => {
    let header = title;
    let copyNumber = 2;
    while (usedHeaders.has(header)) {
      header = `${title} (${copyNumber})`;
      copyNumber += 1;
    }
    usedHeaders.add(header);
    return header;
  });
  return [...fixedHeaders, ...questionHeaders];
};

export const responsesToCsv = (
  exportResult: ResponsesExport,
  endingTitles: ReadonlyMap<string, string> = new Map()
): string => {
  const headers = uniqueHeaders(
    RESPONSE_COLUMNS.map((column) => column.header),
    exportResult.questions.map((question) => question.title)
  );
  const rows = exportResult.rows.map((row) => [
    ...RESPONSE_COLUMNS.map((column) => column.cell(row, endingTitles)),
    ...exportResult.questions.map((question) => {
      const answer = row.answers[question._id];
      return answer === undefined ? "" : formatAnswerValue(answer);
    }),
  ]);
  return [headers, ...rows]
    .map((fields) => fields.map(quoteCsvField).join(","))
    .join(CSV_LINE_BREAK);
};
