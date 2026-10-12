import { describe, expect, test } from "vitest";
import { teamOriginProblem } from "../origin";

const ALLOWED = ["app.acme.com", "*.preview.acme.com", "localhost:3000"];

describe("teamOriginProblem", () => {
  test("accepts an exact https origin whose host is an allowed domain", () => {
    expect(teamOriginProblem("https://app.acme.com", ALLOWED)).toBeNull();
    expect(
      teamOriginProblem("https://pr-12.preview.acme.com", ALLOWED)
    ).toBeNull();
  });

  test("never accepts an origin for a key without allowed domains", () => {
    expect(teamOriginProblem("https://app.acme.com", undefined)).toBe(
      "no_allowed_domains"
    );
    expect(teamOriginProblem("https://app.acme.com", [])).toBe(
      "no_allowed_domains"
    );
  });

  test("rejects another host or another port", () => {
    expect(teamOriginProblem("https://evil.test", ALLOWED)).toBe("not_allowed");
    expect(teamOriginProblem("https://app.acme.com.evil.test", ALLOWED)).toBe(
      "not_allowed"
    );
    expect(teamOriginProblem("https://app.acme.com:8443", ALLOWED)).toBe(
      "not_allowed"
    );
  });

  test("rejects anything that is not exactly a secure origin", () => {
    for (const origin of [
      "http://app.acme.com",
      "https://app.acme.com/",
      "https://app.acme.com/settings",
      "https://app.acme.com?x=1",
      "https://user@app.acme.com",
      "https://APP.acme.com",
      "https://app.acme.com:443",
      "javascript:alert(1)",
      "null",
      "",
    ]) {
      expect(teamOriginProblem(origin, ALLOWED)).toBe("invalid");
    }
  });

  test("allows plain http only on loopback hosts", () => {
    expect(teamOriginProblem("http://localhost:3000", ALLOWED)).toBeNull();
    expect(
      teamOriginProblem("http://127.0.0.1:3000", ["127.0.0.1:3000"])
    ).toBeNull();
    expect(teamOriginProblem("http://[::1]:3000", ["[::1]:3000"])).toBeNull();
    expect(
      teamOriginProblem("http://shop.localhost:3000", ["*.localhost:3000"])
    ).toBeNull();
    expect(teamOriginProblem("http://shop.test:3000", ["shop.test:3000"])).toBe(
      "invalid"
    );
  });
});
