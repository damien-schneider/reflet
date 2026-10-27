import { CodeBlock } from "@/components/docs/code-block";
import {
  DocsLink,
  DocsSection,
  type DocsSections,
  DocsSubsection,
  DocsText,
} from "@/components/docs/docs-page";
import { ReferenceTable } from "@/components/docs/reference-table";

const COLUMNS = [
  { kind: "name", label: "Method and path" },
  { kind: "text", label: "Parameters and result" },
] as const;

const READ_ENDPOINTS = [
  [
    "GET /feedback",
    "Organization config: id, name, slug, branding, feedbackSettings, statuses and public tags. Status and tag IDs come from this response.",
  ],
  [
    "GET /feedback/list",
    "Optional query: status, statusId, tagId, search, pagePath, sortBy, limit, offset. Returns { items, total, hasMore }.",
  ],
  [
    "GET /feedback/item?id=…",
    "Required feedback ID. Returns one item, including isSubscribed, or 404.",
  ],
  [
    "GET /feedback/similar?title=…",
    "Up to five publicly visible title matches, each with _id, title, status and voteCount. Fewer than three title characters returns [].",
  ],
  [
    "GET /feedback/comments?feedbackId=…",
    "Required feedback ID; optional sortBy=oldest (default) or newest. Returns root comments with replies arrays. Unavailable feedback returns [].",
  ],
  [
    "GET /feedback/roadmap",
    "Returns { lanes }, one lane per custom status with id, name, slug, color and items. Uses the public feedback projection even with a secret key.",
  ],
  [
    "GET /feedback/changelog",
    "Optional limit, default 20, clamped to 1–100. Returns published releases newest published first, with id, title, description, version, publishedAt and publicly visible linked items.",
  ],
] as const;

const WRITE_ENDPOINTS = [
  [
    "POST /feedback/create",
    "Required title (1–100 characters) and description (1–10,000). Optional tagId, context and internal. Returns 201 { feedbackId, isApproved: false }. internal: true requires a secret key.",
  ],
  [
    "POST /feedback/vote",
    "Signed user required. Body: feedbackId, optional voteType=upvote (default) or downvote. Returns { voteCount, voted }. The same vote toggles off; the opposite vote switches sides.",
  ],
  [
    "POST /feedback/comment",
    "Signed user required. Body: feedbackId, body (1–5,000 characters), optional parentId belonging to the same feedback. Returns 201 { id }.",
  ],
  [
    "POST /feedback/subscribe",
    "Signed user required. Body: feedbackId. Returns { subscribed: true, alreadySubscribed }. Repeated subscriptions do not create duplicates.",
  ],
  [
    "POST /feedback/unsubscribe",
    "Signed user required. Body: feedbackId. Returns { unsubscribed }, false when no subscription existed.",
  ],
  [
    "POST /feedback/screenshot/upload-url",
    "No body. Returns { uploadUrl }. POST image bytes to that URL to obtain { storageId }.",
  ],
  [
    "POST /feedback/screenshot/save",
    "Required feedbackId and storageId. Optional annotatedStorageId, filename, width, height, pageUrl, captureSource and annotations. Returns { screenshotId }.",
  ],
] as const;

const SURVEY_ENDPOINTS = [
  [
    "GET /surveys/eligible",
    "Optional respondentId (up to 200 characters). Returns { surveys }, with active surveys allowed by schedule, response cap, display frequency and sampling. Includes manual triggers.",
  ],
  [
    "GET /surveys/active",
    "Optional respondentId, surveyId and triggerType. Returns the first eligible survey matching these filters, or null.",
  ],
  [
    "POST /surveys/respond/start",
    "Required surveyId; optional respondentId (up to 200 characters), pageUrl (up to 2,000) and userAgent (up to 600). Returns { responseId }. Starting counts as displaying the survey.",
  ],
  [
    "POST /surveys/respond/answer",
    "Required responseId, questionId and value: string, number, boolean, string[] or null. Saves or replaces one answer. null deletes it. Returns { answerId }, null after deletion.",
  ],
  [
    "POST /surveys/respond/complete",
    "Required responseId. Validates required answers along the selected branch, removes off-branch answers, stores the ending and emits survey.response.completed. Returns { success: true, endingId }; repeated completion returns the same ending.",
  ],
  [
    "POST /surveys/respond/dismiss",
    "Required responseId. Abandons an unfinished response; leaves a completed response unchanged. Returns { success: true }.",
  ],
] as const;

function EndpointTable({
  entries,
}: {
  entries: readonly (readonly [string, string])[];
}) {
  return (
    <ReferenceTable
      columns={COLUMNS}
      rows={entries.map(([endpoint, description]) => ({
        cells: [endpoint, description],
        key: endpoint,
      }))}
    />
  );
}

export function EndpointsSection({ sections }: { sections: DocsSections }) {
  return (
    <DocsSection id="endpoints" sections={sections}>
      <DocsText>
        Paths below are relative to /api/v1. GET parameters go in the query
        string; POST parameters go in a JSON object with Content-Type:
        application/json. Use IDs returned by the API, not names or slugs.
        Timestamps are epoch milliseconds.
      </DocsText>
      <DocsSubsection
        id="read-feedback"
        title="Read feedback, roadmap and releases"
      >
        <EndpointTable entries={READ_ENDPOINTS} />
        <DocsText>
          For an RSS reader, GET /rss/&lt;organizationSlug&gt; at the backend
          origin needs no API key. It serves up to 50 published releases as
          application/rss+xml with a one-hour public cache; private or unknown
          organizations return 404. This path is outside /api/v1.
        </DocsText>
        <DocsText>
          Feedback lists default to 50 items, at most 100, with offset=0.
          Request the next page by adding the number of returned items to offset
          while hasMore is true. Pinned items come first, then sortBy: votes
          (default), newest, oldest or comments. Search is a case-insensitive
          substring of title or description. Filters combine; pagePath matches
          the normalized reported page path. Unknown status and sortBy values
          are ignored. Use positive limits and nonnegative offsets.
        </DocsText>
        <DocsText>
          Lifecycle status values are open, under_review, planned, in_progress,
          completed and closed. statusId selects a custom board status, not a
          lifecycle value. With a public key, lists and detail omit unpublished,
          internal and deleted feedback. Lists also omit merged feedback.
          Secret-key list/detail reads include unpublished and internal items,
          private context, assigneeId, claimedBy, GitHub links, publication
          state and author email. Deleted items still stay out of both reads.
        </DocsText>
        <CodeBlock
          code={`curl --get "$REFLET_API_URL/api/v1/feedback/list" \\
  -H "Authorization: Bearer $REFLET_PUBLIC_KEY" \\
  --data-urlencode 'status=open' \\
  --data-urlencode 'sortBy=newest' \\
  --data-urlencode 'limit=20' \\
  --data-urlencode 'offset=0'`}
        />
      </DocsSubsection>
      <DocsSubsection
        id="write-feedback"
        title="Create feedback and act as a user"
      >
        <EndpointTable entries={WRITE_ENDPOINTS} />
        <DocsText>
          Creating feedback and requesting screenshot uploads work with a public
          key even for a private organization. Voting, commenting and
          subscriptions require a signed user token, including when the bearer
          key is secret. A public key can only perform those interactions on
          publicly visible feedback in a public organization. A resolved author
          on new feedback receives an upvote and subscription automatically.
        </DocsText>
        <CodeBlock
          code={`curl "$REFLET_API_URL/api/v1/feedback/create" \\
  -H "Authorization: Bearer $REFLET_PUBLIC_KEY" \\
  -H 'Content-Type: application/json' \\
  -d '{"title":"Export invoices","description":"Add CSV export to billing.","context":{"url":"https://example.com/billing"}}'

# FEEDBACK_ID must be an accessible item returned by the API.
curl "$REFLET_API_URL/api/v1/feedback/comment" \\
  -H "Authorization: Bearer $REFLET_PUBLIC_KEY" \\
  -H "X-User-Token: $USER_TOKEN" \\
  -H 'Content-Type: application/json' \\
  -d "{\\"feedbackId\\":\\"$FEEDBACK_ID\\",\\"body\\":\\"CSV would help our accounting team.\\"}"`}
        />
        <DocsText>
          New feedback starts unapproved and is scheduled for triage. Do not
          assume immediate publication. A secret key can set publication
          explicitly through the administrative API. context accepts url,
          pageTitle, browser, os, device, language, timezone, referrer,
          userAgent, sdkVersion, screen, viewport, string-valued metadata,
          consoleEvents and element selections. It is private diagnostic data:
          send only information you intend to share with the organization. There
          are at most 30 console events and 10 selections; oversized context
          values are rejected, not truncated.
        </DocsText>
      </DocsSubsection>
      <DocsSubsection id="screenshots" title="Upload and attach a screenshot">
        <CodeBlock
          code={`# Requires curl, jq and a local screenshot.png.
UPLOAD_URL=$(curl -fsS -X POST \\
  "$REFLET_API_URL/api/v1/feedback/screenshot/upload-url" \\
  -H "Authorization: Bearer $REFLET_PUBLIC_KEY" | jq -r '.uploadUrl')
STORAGE_ID=$(curl -fsS "$UPLOAD_URL" \\
  -H 'Content-Type: image/png' \\
  --data-binary @screenshot.png | jq -r '.storageId')
curl "$REFLET_API_URL/api/v1/feedback/screenshot/save" \\
  -H "Authorization: Bearer $REFLET_PUBLIC_KEY" \\
  -H 'Content-Type: application/json' \\
  -d "{\\"feedbackId\\":\\"$FEEDBACK_ID\\",\\"storageId\\":\\"$STORAGE_ID\\",\\"filename\\":\\"screenshot.png\\"}"`}
        />
        <DocsText>
          Uploads must be PNG, JPEG, WebP, GIF or AVIF, at most 10 MiB, uploaded
          within 30 minutes and not already attached elsewhere. The server reads
          type and size from storage. A public key can attach at most 10 images
          within 30 minutes of feedback creation, using the same resolved user
          as the reporter (or no user for an anonymous report). Add the same
          X-User-Token to the save request for an identified report. A secret
          key bypasses the reporter, feedback-age and count restrictions, not
          upload validation.
        </DocsText>
        <DocsText>
          captureSource is widget (default) or element. annotations accepts up
          to 50 shapes with type and x/y: rectangle, arrow, text, blur, pen,
          highlight or spotlight. Optional fields are color, width, height,
          endX/endY, text (up to 280 characters) and points (up to 500 x/y
          points). Upload a separate rendered image as annotatedStorageId when
          needed. Neither annotations nor a blurred rendered image removes the
          original upload; do not upload sensitive pixels.
        </DocsText>
      </DocsSubsection>
      <DocsSubsection id="surveys" title="Render and answer a survey">
        <EndpointTable entries={SURVEY_ENDPOINTS} />
        <DocsText>
          Survey endpoints accept public or secret keys for public and private
          organizations. A user token is optional attribution, not authorization
          for a response. Keep response IDs private: answer, complete and
          dismiss are scoped to the organization and response ID, not checked
          against the current respondent. Reuse a stable respondentId or user
          token for frequency and sampling; without either, frequency does not
          block display and sampling admits everyone.
        </DocsText>
        <DocsText>
          Survey records contain sorted questions, endings, display settings and
          triggerConfig. Your client decides when to show eligible surveys.
          triggerType is manual, page_visit, time_delay, exit_intent,
          feedback_submitted or event. See the{" "}
          <DocsLink href="/docs/sdk/surveys">survey integration guide</DocsLink>{" "}
          for trigger matching and question flow.
        </DocsText>
        <CodeBlock
          code={`# Inspect eligible surveys and use their returned survey/question IDs.
curl "$REFLET_API_URL/api/v1/surveys/eligible?respondentId=visitor_123" \\
  -H "Authorization: Bearer $REFLET_PUBLIC_KEY"

curl "$REFLET_API_URL/api/v1/surveys/respond/start" \\
  -H "Authorization: Bearer $REFLET_PUBLIC_KEY" \\
  -H 'Content-Type: application/json' \\
  -d "{\\"surveyId\\":\\"$SURVEY_ID\\",\\"respondentId\\":\\"visitor_123\\"}"

# For an NPS question, after setting RESPONSE_ID and QUESTION_ID:
curl "$REFLET_API_URL/api/v1/surveys/respond/answer" \\
  -H "Authorization: Bearer $REFLET_PUBLIC_KEY" \\
  -H 'Content-Type: application/json' \\
  -d "{\\"responseId\\":\\"$RESPONSE_ID\\",\\"questionId\\":\\"$QUESTION_ID\\",\\"value\\":9}"

curl "$REFLET_API_URL/api/v1/surveys/respond/complete" \\
  -H "Authorization: Bearer $REFLET_PUBLIC_KEY" \\
  -H 'Content-Type: application/json' \\
  -d "{\\"responseId\\":\\"$RESPONSE_ID\\"}"`}
        />
        <DocsText>
          Answers must match the question: an integer in range for NPS/rating, a
          boolean for yes/no, text, one listed choice, or distinct listed
          choices for multiple choice. An enabled Other option accepts one
          unlisted choice. Statement questions take no answer. Invalid answers,
          ineligible starts and missing required answers return 400. Completed
          or abandoned responses cannot accept answers. Unfinished responses
          older than 24 hours are abandoned by a scheduled job.
        </DocsText>
      </DocsSubsection>
    </DocsSection>
  );
}
