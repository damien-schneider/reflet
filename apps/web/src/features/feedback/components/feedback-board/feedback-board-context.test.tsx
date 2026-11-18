/**
 * @vitest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useFeedbackBoard } from "./feedback-board-context";

describe("useFeedbackBoard", () => {
  it("throws when used outside provider", () => {
    expect(() => {
      renderHook(() => useFeedbackBoard());
    }).toThrow("useFeedbackBoard must be used within a FeedbackBoardProvider");
  });
});
