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
