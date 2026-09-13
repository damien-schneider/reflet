const SUPPORTS_COLOR = !process.env.NO_COLOR && process.stdout.isTTY === true;

function paint(code: string, text: string): string {
  return SUPPORTS_COLOR ? `\u001B[${code}m${text}\u001B[0m` : text;
}

export const style = {
  bold: (text: string) => paint("1", text),
  cyan: (text: string) => paint("36", text),
  dim: (text: string) => paint("2", text),
  green: (text: string) => paint("32", text),
  red: (text: string) => paint("31", text),
  yellow: (text: string) => paint("33", text),
};

export const SYMBOL = {
  bullet: style.dim("·"),
  cross: style.red("✖"),
  info: style.cyan("›"),
  tick: style.green("✔"),
  warn: style.yellow("!"),
};

export function heading(text: string): string {
  return `\n${style.bold(text)}`;
}

export function indent(text: string, width = 2): string {
  const pad = " ".repeat(width);
  return text
    .split("\n")
    .map((line) => (line ? `${pad}${line}` : line))
    .join("\n");
}

type Cell = string | number | boolean | null | undefined;

function isCell(value: unknown): value is Cell {
  return value === null || typeof value !== "object";
}

function cellText(value: Cell): string {
  return value === null || value === undefined ? "" : String(value);
}

export function table(rows: Record<string, unknown>[]): string {
  const first = rows[0];
  if (!first) {
    return style.dim("(empty)");
  }
  const columns = Object.keys(first).filter((key) => isCell(first[key]));
  const widths = columns.map((column) =>
    Math.max(
      column.length,
      ...rows.map(
        (row) => cellText(isCell(row[column]) ? row[column] : "").length
      )
    )
  );
  const line = (cells: string[]) =>
    cells.map((cell, index) => cell.padEnd(widths[index] ?? 0)).join("  ");
  return [
    style.bold(line(columns)),
    ...rows.map((row) =>
      line(
        columns.map((column) =>
          cellText(isCell(row[column]) ? row[column] : "")
        )
      )
    ),
  ].join("\n");
}
