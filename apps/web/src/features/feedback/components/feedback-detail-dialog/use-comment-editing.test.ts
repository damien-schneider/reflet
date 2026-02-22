import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCommentEditing } from "./use-comment-editing";

describe("useCommentEditing", () => {
  const feedbackId = "feedback123" as Id<"feedback">;
  const commentId1 = "comment1" as Id<"comments">;
  const commentId2 = "comment2" as Id<"comments">;

  const createComment = vi.fn().mockResolvedValue(undefined);
  const updateComment = vi.fn().mockResolvedValue(undefined);
  const deleteComment = vi.fn().mockResolvedValue(undefined);

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderUseCommentEditing = (
    overrides?: Partial<Parameters<typeof useCommentEditing>[0]>
  ) =>
    renderHook(() =>
      useCommentEditing({
        feedbackId,
        createComment,
        updateComment,
        deleteComment,
        ...overrides,
      })
    );

  it("should initialize with default state", () => {
    const { result } = renderUseCommentEditing();
    expect(result.current.newComment).toBe("");
    expect(result.current.replyingTo).toBeNull();
    expect(result.current.replyContent).toBe("");
    expect(result.current.editingCommentId).toBeNull();
    expect(result.current.editCommentContent).toBe("");
    expect(result.current.isSubmittingComment).toBe(false);
    expect(result.current.commentToDelete).toBeNull();
  });

  describe("handleSubmitComment", () => {
    it("should call createComment with feedbackId and trimmed body", async () => {
      const { result } = renderUseCommentEditing();

      act(() => {
        result.current.setNewComment("  Hello world  ");
      });

      await act(async () => {
        await result.current.handleSubmitComment();
      });

      expect(createComment).toHaveBeenCalledWith({
        feedbackId,
        body: "Hello world",
      });
      expect(result.current.newComment).toBe("");
    });

    it("should not call createComment when comment is empty", async () => {
      const { result } = renderUseCommentEditing();

      await act(async () => {
        await result.current.handleSubmitComment();
      });

      expect(createComment).not.toHaveBeenCalled();
    });

    it("should not call createComment when comment is only whitespace", async () => {
      const { result } = renderUseCommentEditing();

      act(() => {
        result.current.setNewComment("   ");
      });

      await act(async () => {
        await result.current.handleSubmitComment();
      });

      expect(createComment).not.toHaveBeenCalled();
    });

    it("should not call createComment when feedbackId is null", async () => {
      const { result } = renderUseCommentEditing({ feedbackId: null });

      act(() => {
        result.current.setNewComment("Hello");
      });

      await act(async () => {
        await result.current.handleSubmitComment();
      });

      expect(createComment).not.toHaveBeenCalled();
    });

    it("should set isSubmittingComment during submission", async () => {
      let resolvePromise: () => void;
      const slowCreate = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolvePromise = resolve;
          })
      );
      const { result } = renderUseCommentEditing({
        createComment: slowCreate,
      });

      act(() => {
        result.current.setNewComment("Hello");
      });

      let submitPromise: Promise<void>;
      act(() => {
        submitPromise = result.current.handleSubmitComment();
      });

      expect(result.current.isSubmittingComment).toBe(true);

      await act(async () => {
        resolvePromise?.();
        await submitPromise;
      });

      expect(result.current.isSubmittingComment).toBe(false);
    });

    it("should reset isSubmittingComment on error", async () => {
      const failCreate = vi.fn().mockRejectedValue(new Error("fail"));
      const { result } = renderUseCommentEditing({
        createComment: failCreate,
      });

      act(() => {
        result.current.setNewComment("Hello");
      });

      await act(async () => {
        try {
          await result.current.handleSubmitComment();
        } catch {
          // expected
        }
      });

      expect(result.current.isSubmittingComment).toBe(false);
    });
  });

  describe("handleSubmitReply", () => {
    it("should call createComment with parentId and trimmed body", async () => {
      const { result } = renderUseCommentEditing();

      act(() => {
        result.current.setReplyContent("  Reply text  ");
      });

      await act(async () => {
        await result.current.handleSubmitReply(commentId1);
      });

      expect(createComment).toHaveBeenCalledWith({
        feedbackId,
        body: "Reply text",
        parentId: commentId1,
      });
      expect(result.current.replyContent).toBe("");
      expect(result.current.replyingTo).toBeNull();
    });

    it("should not submit when reply is empty", async () => {
      const { result } = renderUseCommentEditing();

      await act(async () => {
        await result.current.handleSubmitReply(commentId1);
      });

      expect(createComment).not.toHaveBeenCalled();
    });

    it("should not submit when feedbackId is null", async () => {
      const { result } = renderUseCommentEditing({ feedbackId: null });

      act(() => {
        result.current.setReplyContent("Reply");
      });

      await act(async () => {
        await result.current.handleSubmitReply(commentId1);
      });

      expect(createComment).not.toHaveBeenCalled();
    });
  });

  describe("handleUpdateComment", () => {
    it("should call updateComment with id and trimmed body", async () => {
      const { result } = renderUseCommentEditing();

      act(() => {
        result.current.setEditCommentContent("  Updated text  ");
      });

      await act(async () => {
        await result.current.handleUpdateComment(commentId1);
      });

      expect(updateComment).toHaveBeenCalledWith({
        id: commentId1,
        body: "Updated text",
      });
      expect(result.current.editingCommentId).toBeNull();
      expect(result.current.editCommentContent).toBe("");
    });

    it("should not update when content is empty", async () => {
      const { result } = renderUseCommentEditing();

      await act(async () => {
        await result.current.handleUpdateComment(commentId1);
      });

      expect(updateComment).not.toHaveBeenCalled();
    });

    it("should not update when content is only whitespace", async () => {
      const { result } = renderUseCommentEditing();

      act(() => {
        result.current.setEditCommentContent("   ");
      });

      await act(async () => {
        await result.current.handleUpdateComment(commentId1);
      });

      expect(updateComment).not.toHaveBeenCalled();
    });
  });

  describe("handleDeleteComment", () => {
    it("should call deleteComment with the comment id", async () => {
      const { result } = renderUseCommentEditing();

      act(() => {
        result.current.setCommentToDelete(commentId2);
      });

      await act(async () => {
        await result.current.handleDeleteComment();
      });

      expect(deleteComment).toHaveBeenCalledWith({ id: commentId2 });
      expect(result.current.commentToDelete).toBeNull();
    });

    it("should not delete when commentToDelete is null", async () => {
      const { result } = renderUseCommentEditing();

      await act(async () => {
        await result.current.handleDeleteComment();
      });

      expect(deleteComment).not.toHaveBeenCalled();
    });
  });

  describe("state setters", () => {
    it("should update replyingTo", () => {
      const { result } = renderUseCommentEditing();

      act(() => {
        result.current.setReplyingTo(commentId1);
      });

      expect(result.current.replyingTo).toBe(commentId1);
    });

    it("should update editingCommentId", () => {
      const { result } = renderUseCommentEditing();

      act(() => {
        result.current.setEditingCommentId(commentId1);
      });

      expect(result.current.editingCommentId).toBe(commentId1);
    });

    it("should update commentToDelete", () => {
      const { result } = renderUseCommentEditing();

      act(() => {
        result.current.setCommentToDelete(commentId1);
      });

      expect(result.current.commentToDelete).toBe(commentId1);
    });
  });
});
