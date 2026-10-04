import { useMemo, useSyncExternalStore } from "react";
import { useRefletContext } from "../react-context";
import { surveyControllerFor } from "./controller";

export interface RefletSurveysApi {
  /** Survey on screen, or null. */
  activeSurveyId: string | null;
  /** Closes the survey on screen; an unfinished response is marked abandoned. */
  dismissSurvey: () => void;
  /** Shows an eligible survey now, whatever its trigger (use for `manual` surveys). */
  showSurvey: (surveyId: string) => void;
  /** Fires surveys triggered by this custom event. */
  track: (eventName: string) => void;
}

/**
 * Drives `<RefletSurveys />` from anywhere inside `RefletProvider`. Calls made
 * before surveys load are queued and replayed once they do.
 */
export function useRefletSurveys(): RefletSurveysApi {
  const { baseUrl, publicKey } = useRefletContext();
  const controller = surveyControllerFor(publicKey, baseUrl);
  const activeSurveyId = useSyncExternalStore(
    controller.subscribe,
    () => controller.getActiveSession()?.survey._id ?? null,
    () => null
  );

  return useMemo(
    () => ({
      activeSurveyId,
      dismissSurvey: () => controller.dismissSurvey(),
      showSurvey: (surveyId: string) => controller.showSurvey(surveyId),
      track: (eventName: string) => controller.track(eventName),
    }),
    [activeSurveyId, controller]
  );
}
