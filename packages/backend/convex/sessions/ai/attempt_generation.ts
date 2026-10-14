export const attemptGeneration = async <Output>(
  generate: () => Promise<Output>,
  label: string
): Promise<Output | null> => {
  try {
    return await generate();
  } catch (error) {
    const errorClass = error instanceof Error ? error.name : typeof error;
    console.error(`[sessions.ai] ${label} failed: ${errorClass}`);
    return null;
  }
};
