import {
  MAX_COMMENT_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_NAME_LENGTH,
  MAX_TITLE_LENGTH,
} from "./constants";

export function validateFeedback(
  title?: string,
  description?: string
) {
  if (title !== undefined && title.length > MAX_TITLE_LENGTH) {
    throw new Error(
      `Title must be ${MAX_TITLE_LENGTH} characters or less.`
    );
  }

  if (description !== undefined && description.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(
      `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less.`
    );
  }
}

export function validateComment(body: string) {
  if (body.length > MAX_COMMENT_LENGTH) {
    throw new Error(
      `Comment must be ${MAX_COMMENT_LENGTH} characters or less.`
    );
  }
}

export function validateBoard(name?: string, description?: string | null) {
  if (name && name.length > MAX_NAME_LENGTH) {
    throw new Error(
      `Board name must be ${MAX_NAME_LENGTH} characters or less.`
    );
  }

  if (
    description &&
    description.length > MAX_DESCRIPTION_LENGTH
  ) {
    throw new Error(
      `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less.`
    );
  }
}
