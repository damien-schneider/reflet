import { describe, expect, test } from "vitest";
import { parseBridgeRegistrationInput } from "../bridge_api";

describe("bridge API validation", () => {
  test("rejects registrations without doctor checks", () => {
    expect(() =>
      parseBridgeRegistrationInput({
        bridgeName: "Reflet Bridge",
        claudeAvailable: true,
        doctorChecks: [],
        repoFullName: "acme/reflet",
      })
    ).toThrow();
  });
});
