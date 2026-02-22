/**
 * @vitest-environment jsdom
 */
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useSubmitFeedback } from "./use-submit-feedback";

const baseParams = {
  organizationId: "org1" as Id<"organizations">,
  isMember: true,
  createFeedbackPublic: vi.fn(),
  createFeedbackMember: vi.fn().mockResolvedValue("f1" as Id<"feedback">),
  assignFeedback: vi.fn(),
  closeSubmitDrawer: vi.fn(),
};

describe("useSubmitFeedback", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with empty state", () => {
    const { result } = renderHook(() => useSubmitFeedback(baseParams));
    expect(result.current.newFeedback.title).toBe("");
    expect(result.current.newFeedback.description).toBe("");
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.submitTagId).toBeUndefined();
    expect(result.current.submitAssigneeId).toBeUndefined();
  });

  it("does not submit when title is empty", async () => {
    const { result } = renderHook(() => useSubmitFeedback(baseParams));

    await act(async () => {
      await result.current.handleSubmitFeedback();
    });

    expect(baseParams.createFeedbackMember).not.toHaveBeenCalled();
  });

  it("does not submit when title is only whitespace", async () => {
    const { result } = renderHook(() => useSubmitFeedback(baseParams));

    act(() => {
      result.current.setNewFeedback({
        title: "   ",
        description: "",
        email: "",
        attachments: [],
      });
    });

    await act(async () => {
      await result.current.handleSubmitFeedback();
    });

    expect(baseParams.createFeedbackMember).not.toHaveBeenCalled();
  });

  it("does not submit when title exceeds 100 characters", async () => {
    const { result } = renderHook(() => useSubmitFeedback(baseParams));

    act(() => {
      result.current.setNewFeedback({
        title: "a".repeat(101),
        description: "",
        email: "",
        attachments: [],
      });
    });

    await act(async () => {
      await result.current.handleSubmitFeedback();
    });

    expect(baseParams.createFeedbackMember).not.toHaveBeenCalled();
  });

  it("submits as member when isMember is true", async () => {
    const { result } = renderHook(() => useSubmitFeedback(baseParams));

    act(() => {
      result.current.setNewFeedback({
        title: "Valid title",
        description: "desc",
        email: "",
        attachments: [],
      });
    });

    await act(async () => {
      await result.current.handleSubmitFeedback();
    });

    expect(baseParams.createFeedbackMember).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Valid title", description: "desc" })
    );
    expect(baseParams.closeSubmitDrawer).toHaveBeenCalled();
  });

  it("submits as public when isMember is false", async () => {
    const params = { ...baseParams, isMember: false };
    const { result } = renderHook(() => useSubmitFeedback(params));

    act(() => {
      result.current.setNewFeedback({
        title: "Public feedback",
        description: "desc",
        email: "test@example.com",
        attachments: [],
      });
    });

    await act(async () => {
      await result.current.handleSubmitFeedback();
    });

    expect(params.createFeedbackPublic).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Public feedback",
        email: "test@example.com",
      })
    );
  });

  it("assigns feedback after creation when assignee is set", async () => {
    const { result } = renderHook(() => useSubmitFeedback(baseParams));

    act(() => {
      result.current.setNewFeedback({
        title: "With assignee",
        description: "",
        email: "",
        attachments: [],
      });
      result.current.setSubmitAssigneeId("user1");
    });

    await act(async () => {
      await result.current.handleSubmitFeedback();
    });

    expect(baseParams.assignFeedback).toHaveBeenCalledWith({
      feedbackId: "f1",
      assigneeId: "user1",
    });
  });

  it("resets state after successful submission", async () => {
    const { result } = renderHook(() => useSubmitFeedback(baseParams));

    act(() => {
      result.current.setNewFeedback({
        title: "Test",
        description: "",
        email: "",
        attachments: [],
      });
      result.current.setSubmitTagId("tag1" as Id<"tags">);
    });

    await act(async () => {
      await result.current.handleSubmitFeedback();
    });

    expect(result.current.newFeedback.title).toBe("");
    expect(result.current.submitTagId).toBeUndefined();
    expect(result.current.submitAssigneeId).toBeUndefined();
  });

  it("keeps drawer open on error", async () => {
    const failParams = {
      ...baseParams,
      createFeedbackMember: vi.fn().mockRejectedValue(new Error("fail")),
    };
    const { result } = renderHook(() => useSubmitFeedback(failParams));

    act(() => {
      result.current.setNewFeedback({
        title: "Test",
        description: "",
        email: "",
        attachments: [],
      });
    });

    await act(async () => {
      await result.current.handleSubmitFeedback();
    });

    expect(failParams.closeSubmitDrawer).not.toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);
  });
});
