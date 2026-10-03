const MS_THRESHOLD = 1e12;

/**
 * Convert a Stripe timestamp (Unix seconds) to JavaScript milliseconds.
 * Safely handles values already in milliseconds, zero, and undefined.
 */
export const stripeTimestampToMs = (timestamp: number | undefined): number => {
  if (!timestamp) {
    return 0;
  }

  // Timestamps above 1e12 are already in milliseconds
  if (timestamp >= MS_THRESHOLD) {
    return timestamp;
  }

  return timestamp * 1000;
};
