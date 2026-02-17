import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("utils", () => {
  it("should merge class names correctly", () => {
    const result = cn("class1", "class2");
    expect(result).toBe("class1 class2");
  });

  it("should handle conditional classes", () => {
    const result = cn("base", "conditional");
    expect(result).toBe("base conditional");
  });
});
