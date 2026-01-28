/**
 * Validate input length to prevent DoS
 */
export const validateInputLength = (
  input: string | undefined | null,
  maxLength: number,
  fieldName: string
) => {
  if (input && input.length > maxLength) {
    throw new Error(
      `${fieldName} must be ${maxLength} characters or less. Currently ${input.length} characters.`
    );
  }
};
