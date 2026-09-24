import type { LineRange } from "../../protocol";

const FAILED = -1;
const MAX_TAG_LOOKBACK = 2;
const TAG_NAME_START = /[A-Za-z_$]/;
const TAG_NAME_CHAR = /[\w$.:-]/;
const IDENTIFIER_CHAR = /[\w$]/;
const WHITESPACE = /\s/;
const JSX_EXPRESSION_LEAD = /[([{,;=?:&|!>]/;
const JSX_KEYWORD_LEADS = ["return", "yield", "default", "await"];

interface OpeningTag {
  end: number;
  name: string;
  selfClosing: boolean;
}

function isTagStart(code: string, index: number): boolean {
  if (code.charAt(index) !== "<") {
    return false;
  }
  const next = code.charAt(index + 1);
  return next === ">" || TAG_NAME_START.test(next);
}

function startsJsxInExpression(code: string, index: number): boolean {
  let cursor = index - 1;
  while (cursor >= 0 && WHITESPACE.test(code.charAt(cursor))) {
    cursor -= 1;
  }
  if (cursor < 0) {
    return true;
  }
  const previous = code.charAt(cursor);
  if (JSX_EXPRESSION_LEAD.test(previous)) {
    return true;
  }
  let wordStart = cursor;
  while (wordStart > 0 && IDENTIFIER_CHAR.test(code.charAt(wordStart - 1))) {
    wordStart -= 1;
  }
  return JSX_KEYWORD_LEADS.includes(code.slice(wordStart, cursor + 1));
}

function skipJsString(code: string, index: number): number {
  const quote = code.charAt(index);
  let cursor = index + 1;
  while (cursor < code.length) {
    const char = code.charAt(cursor);
    if (char === "\\") {
      cursor += 2;
    } else if (char === quote) {
      return cursor + 1;
    } else if (char === "\n") {
      return index + 1;
    } else {
      cursor += 1;
    }
  }
  return index + 1;
}

function skipTemplate(code: string, index: number): number {
  let cursor = index + 1;
  while (cursor < code.length) {
    const char = code.charAt(cursor);
    if (char === "\\") {
      cursor += 2;
    } else if (char === "`") {
      return cursor + 1;
    } else if (char === "$" && code.charAt(cursor + 1) === "{") {
      cursor = skipJsExpression(code, cursor + 1);
      if (cursor === FAILED) {
        return FAILED;
      }
    } else {
      cursor += 1;
    }
  }
  return FAILED;
}

function skipJsToken(code: string, index: number): number {
  const char = code.charAt(index);
  const next = code.charAt(index + 1);
  if (char === '"' || char === "'") {
    return skipJsString(code, index);
  }
  if (char === "`") {
    return skipTemplate(code, index);
  }
  if (char === "/" && next === "/") {
    const lineEnd = code.indexOf("\n", index);
    return lineEnd === -1 ? code.length : lineEnd;
  }
  if (char === "/" && next === "*") {
    const commentEnd = code.indexOf("*/", index + 2);
    return commentEnd === -1 ? FAILED : commentEnd + 2;
  }
  if (isTagStart(code, index) && startsJsxInExpression(code, index)) {
    return skipElement(code, index);
  }
  return index + 1;
}

function skipJsExpression(code: string, index: number): number {
  let depth = 0;
  let cursor = index;
  while (cursor < code.length) {
    const char = code.charAt(cursor);
    if (char === "{" || char === "}") {
      depth += char === "{" ? 1 : -1;
      cursor += 1;
      if (depth === 0) {
        return cursor;
      }
    } else {
      cursor = skipJsToken(code, cursor);
      if (cursor === FAILED) {
        return FAILED;
      }
    }
  }
  return FAILED;
}

function skipTypeArguments(code: string, index: number): number {
  let depth = 0;
  for (let cursor = index; cursor < code.length; cursor += 1) {
    const char = code.charAt(cursor);
    if (char === "<") {
      depth += 1;
    } else if (char === ">") {
      depth -= 1;
      if (depth === 0) {
        return cursor + 1;
      }
    }
  }
  return FAILED;
}

function skipAttributeToken(code: string, index: number): number {
  const char = code.charAt(index);
  if (char === "{") {
    return skipJsExpression(code, index);
  }
  if (char === '"' || char === "'") {
    const closingQuote = code.indexOf(char, index + 1);
    return closingQuote === -1 ? FAILED : closingQuote + 1;
  }
  return index + 1;
}

function readTagName(code: string, index: number): number {
  let cursor = index;
  while (TAG_NAME_CHAR.test(code.charAt(cursor))) {
    cursor += 1;
  }
  return cursor;
}

function readOpeningTag(code: string, index: number): OpeningTag | null {
  const nameEnd = readTagName(code, index + 1);
  const name = code.slice(index + 1, nameEnd);
  let cursor =
    code.charAt(nameEnd) === "<" ? skipTypeArguments(code, nameEnd) : nameEnd;

  while (cursor !== FAILED && cursor < code.length) {
    const char = code.charAt(cursor);
    if (char === ">") {
      return { end: cursor + 1, name, selfClosing: false };
    }
    if (char === "/" && code.charAt(cursor + 1) === ">") {
      return { end: cursor + 2, name, selfClosing: true };
    }
    cursor = skipAttributeToken(code, cursor);
  }
  return null;
}

function readClosingTagEnd(code: string, index: number, name: string): number {
  let cursor = index + 2;
  while (WHITESPACE.test(code.charAt(cursor))) {
    cursor += 1;
  }
  const nameEnd = readTagName(code, cursor);
  if (code.slice(cursor, nameEnd) !== name) {
    return FAILED;
  }
  cursor = nameEnd;
  while (WHITESPACE.test(code.charAt(cursor))) {
    cursor += 1;
  }
  return code.charAt(cursor) === ">" ? cursor + 1 : FAILED;
}

function skipChildren(code: string, index: number, name: string): number {
  let cursor = index;
  while (cursor !== FAILED && cursor < code.length) {
    const char = code.charAt(cursor);
    if (char === "<" && code.charAt(cursor + 1) === "/") {
      return readClosingTagEnd(code, cursor, name);
    }
    if (char === "{") {
      cursor = skipJsExpression(code, cursor);
    } else if (isTagStart(code, cursor)) {
      cursor = skipElement(code, cursor);
    } else {
      cursor += 1;
    }
  }
  return FAILED;
}

function skipElement(code: string, index: number): number {
  const tag = readOpeningTag(code, index);
  if (!tag) {
    return FAILED;
  }
  return tag.selfClosing ? tag.end : skipChildren(code, tag.end, tag.name);
}

function lineOffset(code: string, line: number): number {
  if (!Number.isInteger(line) || line < 1) {
    return FAILED;
  }
  let offset = 0;
  for (let current = 1; current < line; current += 1) {
    const newline = code.indexOf("\n", offset);
    if (newline === -1) {
      return FAILED;
    }
    offset = newline + 1;
  }
  return offset;
}

function findTagStart(
  code: string,
  lineStart: number,
  lineEnd: number,
  column: number
): number {
  const origin = Math.min(lineStart + Math.max(column, 0), lineEnd);
  for (let back = 0; back <= MAX_TAG_LOOKBACK; back += 1) {
    const candidate = origin - back;
    if (candidate >= lineStart && isTagStart(code, candidate)) {
      return candidate;
    }
  }
  for (let candidate = origin + 1; candidate < lineEnd; candidate += 1) {
    if (isTagStart(code, candidate)) {
      return candidate;
    }
  }
  return FAILED;
}

function countNewlines(code: string, from: number, to: number): number {
  let count = 0;
  let newline = code.indexOf("\n", from);
  while (newline !== -1 && newline < to) {
    count += 1;
    newline = code.indexOf("\n", newline + 1);
  }
  return count;
}

/** Lines spanned by the JSX element at a 1-based line and 0-based column. */
export function jsxElementLines(
  code: string,
  line: number,
  column: number
): LineRange | null {
  const lineStart = lineOffset(code, line);
  if (lineStart === FAILED) {
    return null;
  }
  const newline = code.indexOf("\n", lineStart);
  const lineEnd = newline === -1 ? code.length : newline;
  const tagStart = findTagStart(code, lineStart, lineEnd, column);
  if (tagStart === FAILED) {
    return null;
  }
  const elementEnd = skipElement(code, tagStart);
  if (elementEnd === FAILED) {
    return null;
  }
  return {
    end: line + countNewlines(code, tagStart, elementEnd - 1),
    start: line,
  };
}
