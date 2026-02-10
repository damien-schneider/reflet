"use client";

import { DotsThreeVertical, Pencil, Trash } from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListTrigger,
} from "@/components/ui/dropdown-menu";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";

export interface CommentData {
  _id: string;
  body: string;
  createdAt: number;
  authorName?: string;
  authorImage?: string;
  isAuthor?: boolean;
  isOfficial?: boolean;
}

export interface CommentItemProps {
  comment: CommentData;
  replies: CommentData[];
  isAdmin: boolean;
  replyingTo: string | null;
  replyContent: string;
  editingCommentId: string | null;
  editCommentContent: string;
  isSubmittingComment: boolean;
  onReply: (id: string) => void;
  onReplyCancel: () => void;
  onReplyContentChange: (content: string) => void;
  onSubmitReply: (parentId: string) => Promise<void>;
  onEdit: (id: string, content: string) => void;
  onEditCancel: () => void;
  onEditContentChange: (content: string) => void;
  onUpdate: (id: string) => Promise<void>;
  onDelete: (id: string) => void;
}

export function CommentItem({
  comment,
  replies,
  isAdmin,
  replyingTo,
  replyContent,
  editingCommentId,
  editCommentContent,
  isSubmittingComment,
  onReply,
  onReplyCancel,
  onReplyContentChange,
  onSubmitReply,
  onEdit,
  onEditCancel,
  onEditContentChange,
  onUpdate,
  onDelete,
}: CommentItemProps) {
  const canModify = comment.isAuthor || isAdmin;
  const isEditing = editingCommentId === comment._id;
  const isReplying = replyingTo === comment._id;

  return (
    <div className="group">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.authorImage} />
          <AvatarFallback>
            {comment.authorName?.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              {comment.authorName || "Anonymous"}
            </span>
            {comment.isOfficial && (
              <Badge className="text-xs" variant="secondary">
                Official
              </Badge>
            )}
            <span className="text-muted-foreground text-xs">
              {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
            </span>
          </div>

          {isEditing ? (
            <div className="mt-2 space-y-2">
              <TiptapMarkdownEditor
                autoFocus
                minimal
                onChange={onEditContentChange}
                placeholder="Edit your comment..."
                value={editCommentContent}
              />
              <div className="flex gap-2">
                <Button onClick={onEditCancel} size="sm" variant="ghost">
                  Cancel
                </Button>
                <Button
                  disabled={!editCommentContent.trim()}
                  onClick={() => onUpdate(comment._id)}
                  size="sm"
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-1 whitespace-pre-wrap text-sm">{comment.body}</p>

              {/* Comment actions */}
              <div className="mt-2 flex items-center gap-2">
                <Button
                  className="h-auto p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => onReply(comment._id)}
                  variant="link"
                >
                  Reply
                </Button>
                {canModify && (
                  <DropdownList>
                    <DropdownListTrigger>
                      <Button
                        className="h-auto p-0 text-muted-foreground opacity-0 group-hover:opacity-100"
                        variant="link"
                      >
                        <DotsThreeVertical className="h-4 w-4" />
                      </Button>
                    </DropdownListTrigger>
                    <DropdownListContent>
                      <DropdownListItem
                        onClick={() => onEdit(comment._id, comment.body)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownListItem>
                      <DropdownListItem
                        className="text-destructive"
                        onClick={() => onDelete(comment._id)}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownListItem>
                    </DropdownListContent>
                  </DropdownList>
                )}
              </div>
            </>
          )}

          {/* Reply input */}
          {isReplying && (
            <div className="mt-3 space-y-2">
              <TiptapMarkdownEditor
                autoFocus
                minimal
                onChange={onReplyContentChange}
                placeholder="Write a reply..."
                value={replyContent}
              />
              <div className="flex gap-2">
                <Button
                  disabled={!replyContent.trim() || isSubmittingComment}
                  onClick={() => onSubmitReply(comment._id)}
                  size="sm"
                >
                  Reply
                </Button>
                <Button onClick={onReplyCancel} size="sm" variant="ghost">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Replies */}
          {replies.length > 0 && (
            <div className="mt-4 space-y-3 border-l-2 pl-4">
              {replies.map((reply) => (
                <ReplyItem
                  editCommentContent={editCommentContent}
                  editingCommentId={editingCommentId}
                  isAdmin={isAdmin}
                  key={reply._id}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onEditCancel={onEditCancel}
                  onEditContentChange={onEditContentChange}
                  onUpdate={onUpdate}
                  reply={reply}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ReplyItemProps {
  reply: CommentData;
  isAdmin: boolean;
  editingCommentId: string | null;
  editCommentContent: string;
  onEdit: (id: string, content: string) => void;
  onEditCancel: () => void;
  onEditContentChange: (content: string) => void;
  onUpdate: (id: string) => Promise<void>;
  onDelete: (id: string) => void;
}

function ReplyItem({
  reply,
  isAdmin,
  editingCommentId,
  editCommentContent,
  onEdit,
  onEditCancel,
  onEditContentChange,
  onUpdate,
  onDelete,
}: ReplyItemProps) {
  return (
    <div className="group flex gap-3">
      <Avatar className="h-6 w-6">
        <AvatarImage src={reply.authorImage} />
        <AvatarFallback className="text-xs">
          {reply.authorName?.charAt(0) || "?"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {reply.authorName || "Anonymous"}
          </span>
          {reply.isOfficial && (
            <Badge className="text-xs" variant="secondary">
              Official
            </Badge>
          )}
          <span className="text-muted-foreground text-xs">
            {formatDistanceToNow(reply.createdAt, {
              addSuffix: true,
            })}
          </span>
        </div>

        {editingCommentId === reply._id ? (
          <div className="mt-2 space-y-2">
            <TiptapMarkdownEditor
              autoFocus
              minimal
              onChange={onEditContentChange}
              placeholder="Edit your reply..."
              value={editCommentContent}
            />
            <div className="flex gap-2">
              <Button onClick={onEditCancel} size="sm" variant="ghost">
                Cancel
              </Button>
              <Button
                disabled={!editCommentContent.trim()}
                onClick={() => onUpdate(reply._id)}
                size="sm"
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-1 whitespace-pre-wrap text-sm">{reply.body}</p>
            {(reply.isAuthor || isAdmin) && (
              <div className="mt-1">
                <DropdownList>
                  <DropdownListTrigger>
                    <Button
                      className="h-auto p-0 text-muted-foreground opacity-0 group-hover:opacity-100"
                      variant="link"
                    >
                      <DotsThreeVertical className="h-4 w-4" />
                    </Button>
                  </DropdownListTrigger>
                  <DropdownListContent>
                    <DropdownListItem
                      onClick={() => onEdit(reply._id, reply.body)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownListItem>
                    <DropdownListItem
                      className="text-destructive"
                      onClick={() => onDelete(reply._id)}
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownListItem>
                  </DropdownListContent>
                </DropdownList>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
