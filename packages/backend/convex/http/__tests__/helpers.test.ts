import { describe, expect, test } from "vitest";
import {
  bool,
  errorResponse,
  jsonResponse,
  num,
  optionalId,
  parseId,
  requireStr,
  str,
  strArr,
} from "../helpers";

describe("http_admin_helpers - value extractors", () => {
  test("str returns string for string input", () => {
    expect(str("hello")).toBe("hello");
    expect(str("")).toBe("");
  });

  test("str returns undefined for non-string input", () => {
    expect(str(123)).toBeUndefined();
    expect(str(null)).toBeUndefined();
    expect(str(undefined)).toBeUndefined();
    expect(str(true)).toBeUndefined();
    expect(str({})).toBeUndefined();
  });

  test("num returns number for number input", () => {
    expect(num(42)).toBe(42);
    expect(num(0)).toBe(0);
    expect(num(-1)).toBe(-1);
  });

  test("num returns undefined for non-number input", () => {
    expect(num("42")).toBeUndefined();
    expect(num(null)).toBeUndefined();
    expect(num(undefined)).toBeUndefined();
  });

  test("bool returns boolean for boolean input", () => {
    expect(bool(true)).toBe(true);
    expect(bool(false)).toBe(false);
  });

  test("bool returns undefined for non-boolean input", () => {
    expect(bool("true")).toBeUndefined();
    expect(bool(1)).toBeUndefined();
    expect(bool(null)).toBeUndefined();
  });

  test("strArr returns string array for valid input", () => {
    expect(strArr(["a", "b"])).toEqual(["a", "b"]);
    expect(strArr([])).toEqual([]);
  });

  test("strArr returns undefined for non-array or mixed array", () => {
    expect(strArr("not-array")).toBeUndefined();
    expect(strArr([1, 2])).toBeUndefined();
    expect(strArr(["a", 2])).toBeUndefined();
    expect(strArr(null)).toBeUndefined();
  });
});

describe("http_admin_helpers - parseId", () => {
  test("returns value as Id for valid string", () => {
    const result = parseId("abc123", "testField");
    expect(result).toBe("abc123");
  });

  test("throws for null/undefined/empty", () => {
    expect(() => parseId(null, "field")).toThrow(
      "Missing required field: field"
    );
    expect(() => parseId(undefined, "field")).toThrow(
      "Missing required field: field"
    );
    expect(() => parseId("", "field")).toThrow("Missing required field: field");
  });
});

describe("http_admin_helpers - requireStr", () => {
  test("returns string for valid non-empty string", () => {
    expect(requireStr("hello", "name")).toBe("hello");
  });

  test("throws for missing or empty", () => {
    expect(() => requireStr("", "name")).toThrow(
      "Missing required field: name"
    );
    expect(() => requireStr(null, "name")).toThrow(
      "Missing required field: name"
    );
    expect(() => requireStr(undefined, "name")).toThrow(
      "Missing required field: name"
    );
    expect(() => requireStr(42, "name")).toThrow(
      "Missing required field: name"
    );
  });
});

describe("http_admin_helpers - optionalId", () => {
  test("returns value for valid string", () => {
    expect(optionalId("abc123")).toBe("abc123");
  });

  test("returns undefined for non-string or empty string", () => {
    expect(optionalId("")).toBeUndefined();
    expect(optionalId(null)).toBeUndefined();
    expect(optionalId(undefined)).toBeUndefined();
    expect(optionalId(123)).toBeUndefined();
  });
});

describe("http_admin_helpers - response helpers", () => {
  test("jsonResponse returns JSON with correct headers", () => {
    const response = jsonResponse({ foo: "bar" });
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  test("jsonResponse supports custom status", () => {
    const response = jsonResponse({ ok: true }, 201);
    expect(response.status).toBe(201);
  });

  test("errorResponse returns error JSON with 400 default", () => {
    const response = errorResponse("Bad input");
    expect(response.status).toBe(400);
  });

  test("errorResponse supports custom status code", () => {
    const response = errorResponse("Not found", 404);
    expect(response.status).toBe(404);
  });
});
