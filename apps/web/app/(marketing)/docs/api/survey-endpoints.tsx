import { DocsLink } from "@/components/docs/docs-page";
import { InlineCode } from "@/components/ui/typography";
import { BASE_URL, type EndpointDefinition, param } from "./endpoint-data";

const SURVEY_ACCESS = (
  <>
    Public or secret key, for public and private organizations alike. A{" "}
    <DocsLink href="#user-token">user token</DocsLink> links the response to
    that user.
  </>
);

const RESPONSE_ID_PARAM = param(
  "responseId",
  "string",
  "Required. From the start call."
);

const ACTIVE_SURVEY: EndpointDefinition = {
  access: SURVEY_ACCESS,
  description: (
    <>
      Get the survey to show right now, with its questions in order. Returns{" "}
      <InlineCode>null</InlineCode> when no active survey is in its schedule and
      under its response cap.
    </>
  ),
  id: "active-survey",
  method: "GET",
  params: [
    param(
      "triggerType",
      "string",
      "Only surveys with this trigger: manual, page_visit, time_delay, exit_intent or feedback_submitted."
    ),
  ],
  path: "/surveys/active",
  request: `curl "${BASE_URL}/surveys/active?triggerType=page_visit" \\
  -H "Authorization: Bearer fb_pub_xxx"`,
  response: `{
  "_id": "kv91…",
  "title": "How are we doing?",
  "triggerType": "page_visit",
  "triggerConfig": { "pageUrl": "/dashboard", "sampleRate": 0.5 },
  "questions": [
    {
      "_id": "kq11…",
      "type": "nps",
      "title": "How likely are you to recommend us?",
      "required": true,
      "order": 0,
      "config": { "minLabel": "Not likely", "maxLabel": "Very likely" }
    }
  ]
}`,
};

const START_RESPONSE: EndpointDefinition = {
  access: SURVEY_ACCESS,
  body: `{
  "surveyId": "kv91…",
  "respondentId": "visitor_8f2c",
  "pageUrl": "https://app.acme.com/dashboard"
}`,
  description:
    "Start a response. Fails while the survey isn’t active or once it reaches its response cap.",
  id: "start-response",
  method: "POST",
  params: [
    param("surveyId", "string", "Required. The survey ID."),
    param("respondentId", "string", "Your own ID for the respondent."),
    param("pageUrl", "string", "Page the survey was shown on."),
    param("userAgent", "string", "The respondent’s browser user agent."),
  ],
  path: "/surveys/respond/start",
  request: `curl -X POST "${BASE_URL}/surveys/respond/start" \\
  -H "Authorization: Bearer fb_pub_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"surveyId": "kv91…"}'`,
  response: `{
  "responseId": "kw07…"
}`,
};

const SUBMIT_ANSWER: EndpointDefinition = {
  access: SURVEY_ACCESS,
  body: `{
  "responseId": "kw07…",
  "questionId": "kq11…",
  "value": 9
}`,
  description:
    "Answer one question. Answering the same question again replaces the earlier answer.",
  id: "submit-answer",
  method: "POST",
  params: [
    RESPONSE_ID_PARAM,
    param("questionId", "string", "Required. The question ID."),
    param(
      "value",
      "string | number | boolean | string[]",
      "Required. A number for rating and NPS, a boolean for yes/no, a string array for multiple choice."
    ),
  ],
  path: "/surveys/respond/answer",
  request: `curl -X POST "${BASE_URL}/surveys/respond/answer" \\
  -H "Authorization: Bearer fb_pub_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"responseId": "kw07…", "questionId": "kq11…", "value": 9}'`,
  response: `{
  "answerId": "ka42…"
}`,
};

const COMPLETE_RESPONSE: EndpointDefinition = {
  access: SURVEY_ACCESS,
  body: `{
  "responseId": "kw07…"
}`,
  description:
    "Mark the response complete. A daily job marks responses left unfinished for more than 24 hours as abandoned.",
  id: "complete-response",
  method: "POST",
  params: [RESPONSE_ID_PARAM],
  path: "/surveys/respond/complete",
  request: `curl -X POST "${BASE_URL}/surveys/respond/complete" \\
  -H "Authorization: Bearer fb_pub_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"responseId": "kw07…"}'`,
  response: `{
  "success": true
}`,
};

export const SURVEY_ENDPOINTS = [
  ACTIVE_SURVEY,
  START_RESPONSE,
  SUBMIT_ANSWER,
  COMPLETE_RESPONSE,
] as const;
