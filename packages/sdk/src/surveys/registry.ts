import type { SurveyController } from "./controller";

/**
 * One survey controller per project (public key + API URL). Kept apart from
 * the controller so the plain client can signal submitted feedback without
 * bundling the survey runtime.
 */
export const surveyControllers = new Map<string, SurveyController>();

/** `baseUrl` is the resolved API URL, so omitting it and passing the default match. */
export const surveyRegistryKey = (publicKey: string, baseUrl: string): string =>
  `${baseUrl}|${publicKey}`;
