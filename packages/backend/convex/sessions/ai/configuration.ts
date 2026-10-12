export const ANALYSIS_NOT_CONFIGURED =
  "AI analysis is not configured on this Reflet deployment.";
export const TRANSCRIPTION_NOT_CONFIGURED =
  "Transcription is not configured on this Reflet deployment.";

export const readOpenRouterKey = (): string | null =>
  process.env.OPENROUTER_API_KEY || null;

export const isAnalysisConfigured = (): boolean => readOpenRouterKey() !== null;

export const isTranscriptionConfigured = (): boolean =>
  readOpenRouterKey() !== null;
