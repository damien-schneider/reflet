import { DocsLink } from "@/components/docs/docs-page";
import { InlineCode } from "@/components/ui/typography";
import { BASE_URL, type EndpointDefinition, param } from "./endpoint-data";

const SURVEY_ACCESS = (
  <>
    Public or secret key, for public and private organizations alike. A{" "}
    <DocsLink href="#user-token">user token</DocsLink> links the response to
    that user and keeps display frequency and sampling stable across their
    devices.
  </>
);

const RESPONDENT_ID_PARAM = param(
  "respondentId",
  "string",
  "Your anonymous ID for this visitor, up to 200 characters. Display frequency and sampling are checked against it and the user token. Without either, frequency never blocks and sampling lets everyone in."
);

const RESPONSE_ID_PARAM = param(
  "responseId",
  "string",
  "Required. From the start call."
);

const ELIGIBLE_SURVEYS: EndpointDefinition = {
  access: SURVEY_ACCESS,
  description: (
    <>
      List every survey this respondent may see right now: active, inside its
      schedule, under its response cap, allowed by its display frequency and
      sampled in. Surveys with the <InlineCode>manual</InlineCode> trigger are
      included too; show them only when your app asks for them. Your client arms
      the triggers. The <DocsLink href="/docs/sdk/surveys">SDK</DocsLink> and
      the{" "}
      <DocsLink href="/docs/widget/feedback-widget#surveys">
        feedback widget
      </DocsLink>{" "}
      do it for you.
    </>
  ),
  id: "eligible-surveys",
  method: "GET",
  note: (
    <>
      Questions come sorted by <InlineCode>order</InlineCode>, and{" "}
      <InlineCode>endings</InlineCode> and <InlineCode>display</InlineCode>{" "}
      always have values. <InlineCode>triggerConfig.pageUrl</InlineCode> holds
      comma- or newline-separated patterns with <InlineCode>*</InlineCode>{" "}
      wildcards: a pattern starting with <InlineCode>/</InlineCode> matches the
      path, anything else the full URL, and an empty value matches every page.{" "}
      <InlineCode>sampleRate</InlineCode> is a percentage from 0 to 100,{" "}
      <InlineCode>delayMs</InlineCode> applies to{" "}
      <InlineCode>time_delay</InlineCode> and <InlineCode>eventName</InlineCode>{" "}
      to <InlineCode>event</InlineCode>. To find the next step, the first rule
      in <InlineCode>logic</InlineCode> that matches the question’s own answer
      wins, then <InlineCode>next</InlineCode>, then the following question,
      then the first ending. Jumps only go forward. A{" "}
      <InlineCode>statement</InlineCode> shows a message and never takes an
      answer.
    </>
  ),
  params: [RESPONDENT_ID_PARAM],
  path: "/surveys/eligible",
  request: `curl "${BASE_URL}/surveys/eligible?respondentId=visitor_8f2c" \\
  -H "Authorization: Bearer fb_pub_xxx"`,
  response: `{
  "surveys": [
    {
      "_id": "kv91…",
      "title": "How are we doing?",
      "triggerType": "page_visit",
      "triggerConfig": { "pageUrl": "/dashboard/*", "sampleRate": 50 },
      "display": {
        "frequency": "until_completed",
        "recontactDays": 30,
        "position": "bottom_right"
      },
      "questions": [
        {
          "_id": "kq11…",
          "type": "nps",
          "title": "How likely are you to recommend us?",
          "required": true,
          "order": 0,
          "config": { "minLabel": "Not likely", "maxLabel": "Very likely" },
          "logic": [
            {
              "id": "low-score",
              "operator": "less_than",
              "value": 7,
              "target": { "kind": "question", "questionId": "kq12…" }
            }
          ],
          "next": { "kind": "ending", "endingId": "thanks" }
        },
        {
          "_id": "kq12…",
          "type": "text",
          "title": "What should we fix first?",
          "required": false,
          "order": 1
        }
      ],
      "endings": [
        { "id": "thanks", "title": "Thanks for the feedback!" }
      ]
    }
  ]
}`,
};

const ACTIVE_SURVEY: EndpointDefinition = {
  access: SURVEY_ACCESS,
  description: (
    <>
      Get the first survey from{" "}
      <DocsLink href="#eligible-surveys">eligible surveys</DocsLink> that
      matches the filters, in the same shape, or <InlineCode>null</InlineCode>{" "}
      when none does. Prefer the eligible list when your client arms several
      triggers.
    </>
  ),
  id: "active-survey",
  method: "GET",
  params: [
    param(
      "triggerType",
      "string",
      "Only surveys with this trigger: manual, page_visit, time_delay, exit_intent, feedback_submitted or event."
    ),
    param("surveyId", "string", "Only this survey."),
    RESPONDENT_ID_PARAM,
  ],
  path: "/surveys/active",
  request: `curl "${BASE_URL}/surveys/active?triggerType=event&respondentId=visitor_8f2c" \\
  -H "Authorization: Bearer fb_pub_xxx"`,
  response: `{
  "_id": "kv93…",
  "title": "How was checkout?",
  "triggerType": "event",
  "triggerConfig": { "eventName": "checkout_completed" },
  "display": { "frequency": "recurring", "recontactDays": 14 },
  "questions": [
    {
      "_id": "kq21…",
      "type": "rating",
      "title": "How easy was checkout?",
      "required": true,
      "order": 0,
      "config": { "minValue": 1, "maxValue": 5, "ratingStyle": "star" }
    }
  ],
  "endings": [
    {
      "id": "default",
      "title": "Thank you!",
      "description": "Your answers have been recorded."
    }
  ]
}`,
};

const START_RESPONSE: EndpointDefinition = {
  access: SURVEY_ACCESS,
  body: `{
  "surveyId": "kv91…",
  "respondentId": "visitor_8f2c",
  "pageUrl": "https://app.acme.com/dashboard",
  "userAgent": "Mozilla/5.0 …"
}`,
  description: (
    <>
      Start a response when the survey appears. Starting counts as showing the
      survey for its display frequency. Returns <InlineCode>400</InlineCode>{" "}
      when the survey isn’t active, is outside its schedule, has reached its
      response cap, was already shown to this respondent or leaves them out of
      its sample. Shares a <DocsLink href="#rate-limiting">rate limit</DocsLink>{" "}
      with dismissing.
    </>
  ),
  id: "start-response",
  method: "POST",
  params: [
    param("surveyId", "string", "Required. The survey ID."),
    RESPONDENT_ID_PARAM,
    param("pageUrl", "string", "Page the survey was shown on."),
    param("userAgent", "string", "The respondent’s browser user agent."),
  ],
  path: "/surveys/respond/start",
  request: `curl -X POST "${BASE_URL}/surveys/respond/start" \\
  -H "Authorization: Bearer fb_pub_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"surveyId": "kv91…", "respondentId": "visitor_8f2c"}'`,
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
  description: (
    <>
      Save one answer while the response is in progress. Answering the same
      question again replaces the earlier answer, and{" "}
      <InlineCode>null</InlineCode> deletes it. Values are checked against the
      question: a whole number in range for NPS (0–10) and ratings, a boolean
      for yes/no, a listed choice for single choice, distinct listed choices for
      multiple choice, and text within the length limit. When the question
      allows “Other”, one unlisted choice is accepted as the respondent’s own
      text.
    </>
  ),
  id: "submit-answer",
  method: "POST",
  note: (
    <>
      Returns <InlineCode>{`{ "answerId": null }`}</InlineCode> after a{" "}
      <InlineCode>null</InlineCode> value. Invalid answers return{" "}
      <InlineCode>400</InlineCode>, e.g.{" "}
      <InlineCode>{`{ "error": "Pick a score from 0 to 10." }`}</InlineCode>, as
      do statements and responses that are already completed or abandoned.
    </>
  ),
  params: [
    RESPONSE_ID_PARAM,
    param("questionId", "string", "Required. The question ID."),
    param(
      "value",
      "string | number | boolean | string[] | null",
      "Required. A number for rating and NPS, a boolean for yes/no, a string for text and single choice, a string array for multiple choice, or null to clear."
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
  description: (
    <>
      Finish the response. Reflet walks the flow with the saved answers, deletes
      answers left on a branch the respondent backed out of, stores the ending
      reached and sends the <InlineCode>survey.response.completed</InlineCode>{" "}
      <DocsLink href="#webhooks">webhook</DocsLink>. Returns{" "}
      <InlineCode>400</InlineCode> when a required question on that path has no
      answer. Completing again returns the same ending. Once completed responses
      reach the survey’s cap, the survey closes.
    </>
  ),
  id: "complete-response",
  method: "POST",
  note: "A daily job marks responses left unfinished for more than 24 hours as abandoned.",
  params: [RESPONSE_ID_PARAM],
  path: "/surveys/respond/complete",
  request: `curl -X POST "${BASE_URL}/surveys/respond/complete" \\
  -H "Authorization: Bearer fb_pub_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"responseId": "kw07…"}'`,
  response: `{
  "success": true,
  "endingId": "thanks"
}`,
};

const DISMISS_RESPONSE: EndpointDefinition = {
  access: SURVEY_ACCESS,
  body: `{
  "responseId": "kw07…"
}`,
  description: (
    <>
      Mark an unfinished response as abandoned right away, e.g. when the
      respondent closes the survey. Does nothing to a completed response. Shares
      a <DocsLink href="#rate-limiting">rate limit</DocsLink> with starting.
    </>
  ),
  id: "dismiss-response",
  method: "POST",
  params: [RESPONSE_ID_PARAM],
  path: "/surveys/respond/dismiss",
  request: `curl -X POST "${BASE_URL}/surveys/respond/dismiss" \\
  -H "Authorization: Bearer fb_pub_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"responseId": "kw07…"}'`,
  response: `{
  "success": true
}`,
};

export const SURVEY_ENDPOINTS = [
  ELIGIBLE_SURVEYS,
  ACTIVE_SURVEY,
  START_RESPONSE,
  SUBMIT_ANSWER,
  COMPLETE_RESPONSE,
  DISMISS_RESPONSE,
] as const;
