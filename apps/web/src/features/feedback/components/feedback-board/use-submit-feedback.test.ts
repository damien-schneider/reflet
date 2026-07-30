/**
 * @vitest-environment jsdom
 */
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useSubmitFeedback } from "./use-submit-feedback";

const baseParams = {
  assignFeedback: vi.fn(),
  closeSubmitDrawer: vi.fn(),
  createFeedbackMember: vi.fn().mockResolvedValue("f1" as Id<"feedback">),
  createFeedbackPublic: vi.fn(),
  isMember: true,
  organizationId: "org1" as Id<"organizations">,
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
        attachments: [],
        description: "",
        email: "",
        title: "   ",
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
        attachments: [],
        description: "",
        email: "",
        title: "a".repeat(101),
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
        attachments: [],
        description: "desc",
        email: "",
        title: "Valid title",
      });
    });

    await act(async () => {
      await result.current.handleSubmitFeedback();
    });

    expect(baseParams.createFeedbackMember).toHaveBeenCalledWith(
      expect.objectContaining({ description: "desc", title: "Valid title" })
    );
    expect(baseParams.closeSubmitDrawer).toHaveBeenCalled();
  });

  it("submits as public when isMember is false", async () => {
    const params = { ...baseParams, isMember: false };
    const { result } = renderHook(() => useSubmitFeedback(params));

    act(() => {
      result.current.setNewFeedback({
        attachments: [],
        description: "desc",
        email: "test@example.com",
        title: "Public feedback",
      });
    });

    await act(async () => {
      await result.current.handleSubmitFeedback();
    });

    expect(params.createFeedbackPublic).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "test@example.com",
        title: "Public feedback",
      })
    );
  });

  it("assigns feedback after creation when assignee is set", async () => {
    const { result } = renderHook(() => useSubmitFeedback(baseParams));

    act(() => {
      result.current.setNewFeedback({
        attachments: [],
        description: "",
        email: "",
        title: "With assignee",
      });
      result.current.setSubmitAssigneeId("user1");
    });

    await act(async () => {
      await result.current.handleSubmitFeedback();
    });

    expect(baseParams.assignFeedback).toHaveBeenCalledWith({
      assigneeId: "user1",
      feedbackId: "f1",
    });
  });

  it("resets state after successful submission", async () => {
    const { result } = renderHook(() => useSubmitFeedback(baseParams));

    act(() => {
      result.current.setNewFeedback({
        attachments: [],
        description: "",
        email: "",
        title: "Test",
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
        attachments: [],
        description: "",
        email: "",
        title: "Test",
      });
    });

    await act(async () => {
      await result.current.handleSubmitFeedback();
    });

    expect(failParams.closeSubmitDrawer).not.toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);
  });
});
