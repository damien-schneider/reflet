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
  { kind: "text", label: "Query or JSON body" },
] as const;

const GROUPS = [
  {
    endpoints: [
      [
        "GET /feedback/next",
        "Optional statuses and tagIds (comma-separated), limit (default 10). Returns an array ordered by priority, votes, then oldest creation.",
      ],
      [
        "POST /feedback/claim-next",
        "Required claimedBy; optional statuses and tagIds arrays. Atomically claims one eligible item, or returns null.",
      ],
      [
        "POST /feedback/claim",
        "Required feedbackId, claimedBy. Claims a specific item; fails if another live claimant owns it.",
      ],
      [
        "POST /feedback/create-github-issue",
        "Required feedbackId. Creates or returns the linked GitHub issue; requires a configured GitHub integration and repository.",
      ],
      [
        "POST /feedback/update",
        "Required feedbackId; optional title, description.",
      ],
      [
        "POST /feedback/delete",
        "Required feedbackId. Archives feedback (soft delete).",
      ],
      [
        "POST /feedback/restore",
        "Required feedbackId. Clears deletion; fails if the item is not deleted.",
      ],
      [
        "POST /feedback/assign",
        "Required feedbackId; optional assigneeId (a member user ID). Omit assigneeId to unassign.",
      ],
      [
        "POST /feedback/set-status",
        "Required feedbackId; status (lifecycle value) or statusId (custom status ID).",
      ],
      [
        "POST /feedback/publication",
        "Required feedbackId, state: internal, pending, approved or rejected. Rejection archives the item; restore before changing publication again.",
      ],
      [
        "POST /feedback/update-tags",
        "Required feedbackId; optional addTagIds and removeTagIds arrays.",
      ],
      [
        "POST /feedback/update-analysis",
        "Required feedbackId; optional priority (critical/high/medium/low/none), complexity (trivial/simple/moderate/complex/very_complex), timeEstimate (string), deadline (timestamp).",
      ],
      ["POST /comment/update", "Required commentId, body."],
      [
        "POST /comment/delete",
        "Required commentId. Deletes the comment and its replies.",
      ],
      [
        "POST /comment/mark-official",
        "Required commentId, isOfficial (boolean).",
      ],
    ],
    title: "Feedback and comments",
  },
  {
    endpoints: [
      [
        "GET /tags",
        "No parameters. Returns all organization tags, including private ones.",
      ],
      [
        "POST /tag/create",
        "Required name, color; optional description, icon, isPublic.",
      ],
      [
        "POST /tag/update",
        "Required tagId; optional name, color, description, icon, isPublic.",
      ],
      ["POST /tag/delete", "Required tagId."],
      ["GET /statuses", "No parameters. Returns custom board statuses."],
      ["POST /status/create", "Required name, color; optional icon."],
      ["POST /status/update", "Required statusId; optional name, color, icon."],
      [
        "POST /status/delete",
        "Required statusId. Requires another column for the same lifecycle state; moves feedback to a replacement column.",
      ],
    ],
    title: "Tags and board statuses",
  },
  {
    endpoints: [
      [
        "GET /releases",
        "Optional status=all (default), draft or published; limit (default 50, max 100), offset (default 0). Returns { items, total, hasMore }, newest created first.",
      ],
      [
        "GET /release?id=…",
        "Required release ID. Returns the release with linkedFeedback, or 404.",
      ],
      [
        "POST /release/create",
        "Required title; optional description, version. Creates a draft and returns { id }. Version must be unique in the organization and at most 50 characters.",
      ],
      [
        "POST /release/update",
        "Required releaseId; optional title, description, version.",
      ],
      [
        "POST /release/publish",
        "Required releaseId. Publishes and schedules announcements.",
      ],
      ["POST /release/unpublish", "Required releaseId. Removes publication."],
      [
        "POST /release/delete",
        "Required releaseId. Deletes the release and its links.",
      ],
      [
        "POST /release/link-feedback",
        "Required releaseId, feedbackId, action: link or unlink.",
      ],
      [
        "POST /release/schedule",
        "Required releaseId, scheduledPublishAt (future timestamp); optional feedbackStatus to apply to linked feedback when published.",
      ],
      ["POST /release/cancel-schedule", "Required releaseId."],
    ],
    title: "Releases",
  },
  {
    endpoints: [
      [
        "GET /milestones",
        "Optional status=all (default), active, completed or archived. Returns an array, not a paginated envelope.",
      ],
      [
        "GET /milestone?id=…",
        "Required milestone ID. Returns detail with linked feedback, or 404.",
      ],
      [
        "POST /milestone/create",
        "Required name, color, timeHorizon; optional description, emoji, targetDate, isPublic. Returns { id }.",
      ],
      [
        "POST /milestone/update",
        "Required milestoneId; optional name, color, timeHorizon, description, emoji, targetDate, isPublic.",
      ],
      ["POST /milestone/complete", "Required milestoneId."],
      ["POST /milestone/delete", "Required milestoneId."],
      [
        "POST /milestone/link-feedback",
        "Required milestoneId, feedbackId, action: link or unlink.",
      ],
    ],
    title: "Milestones",
  },
  {
    endpoints: [
      [
        "GET /surveys",
        "Optional status: draft, active, paused or closed. Returns an array.",
      ],
      [
        "GET /survey?id=…",
        "Required survey ID. Returns survey settings and questions.",
      ],
      [
        "POST /survey/create",
        "Required title, triggerType; optional description, questions, triggerConfig, display, endings. Creates a draft and returns its ID as a JSON string. See the example below.",
      ],
      [
        "POST /survey/update",
        "Required surveyId; optional title, description, triggerType, triggerConfig, display, endings, startsAt, endsAt, maxResponses, linkEnabled. null clears startsAt, endsAt or maxResponses. Does not edit questions.",
      ],
      [
        "POST /survey/update-status",
        "Required surveyId, status: draft, active, paused or closed.",
      ],
      [
        "POST /survey/duplicate",
        "Required surveyId; optional title. Returns the copied draft's ID as a JSON string.",
      ],
      [
        "POST /survey/delete",
        "Required surveyId. Deletes its questions, responses and answers too.",
      ],
      [
        "GET /survey/analytics?id=…",
        "Required survey ID. Returns survey analytics.",
      ],
      [
        "GET /survey/responses?id=…",
        "Required survey ID; optional status (in_progress/completed/abandoned), limit (default 50), cursor. Returns { page, continueCursor, isDone }. Pass continueCursor as the next cursor until isDone.",
      ],
    ],
    title: "Surveys",
  },
  {
    endpoints: [
      ["GET /organization", "No parameters. Returns organization settings."],
      [
        "POST /organization/update",
        "Optional name, isPublic, primaryColor, supportEnabled. Changing isPublic changes public board access.",
      ],
      [
        "GET /members",
        "No parameters. Returns member records, including user IDs for assignment.",
      ],
      ["GET /invitations", "No parameters. Returns invitations."],
      [
        "POST /invitation/create",
        "Required email; omit role or use member. The API rejects admin invitations. Returns { id }; validates seats and schedules an invitation email subject to email limits and suppression.",
      ],
      ["POST /invitation/cancel", "Required invitationId."],
      ["GET /duplicates", "No parameters. Returns pending duplicate pairs."],
      [
        "POST /duplicate/resolve",
        "Required pairId, action: confirm or reject. Marks the pair; use merge to combine feedback.",
      ],
      [
        "POST /duplicate/merge",
        "Required sourceFeedbackId, targetFeedbackId; optional pairId. Copies votes and subscriptions to the target and marks the source merged. Does not transfer comments or tags.",
      ],
      [
        "GET /screenshots?feedbackId=…",
        "Required feedback ID. Returns screenshot metadata and download URLs; the preferred URL uses the annotated image when present.",
      ],
      [
        "POST /screenshot/delete",
        "Required screenshotId. Deletes stored images as well as metadata.",
      ],
    ],
    title: "Organization and other resources",
  },
] as const;

export function AdminSection({ sections }: { sections: DocsSections }) {
  return (
    <DocsSection id="admin-api" sections={sections}>
      <DocsText>
        Every path in this section starts with /api/v1/admin and requires a
        secret fb_sec_ key. The key grants organization administration, not the
        permissions of an end user. No organization ID is accepted. Keep it on
        your server, in a secret store or in the{" "}
        <DocsLink href="/docs/cli">CLI</DocsLink>. Public keys receive 403. Set
        REFLET_API_KEY to your secret key before running these examples. Set
        FEEDBACK_ID to an item returned by a feedback read.
      </DocsText>
      <CodeBlock
        code={`curl "$REFLET_API_URL/api/v1/admin/feedback/set-status" \\
  -H "Authorization: Bearer $REFLET_API_KEY" \\
  -H 'Content-Type: application/json' \\
  -d "{\\"feedbackId\\":\\"$FEEDBACK_ID\\",\\"status\\":\\"planned\\"}"`}
      />
      {GROUPS.map((group) => (
        <DocsSubsection key={group.title} title={group.title}>
          <ReferenceTable
            columns={COLUMNS}
            rows={group.endpoints.map(([endpoint, parameters]) => ({
              cells: [endpoint, parameters],
              key: endpoint,
            }))}
          />
        </DocsSubsection>
      ))}
      <DocsSubsection id="admin-values" title="Values and side effects">
        <DocsText>
          POST bodies use JSON booleans and arrays, not string versions. Dates
          are epoch milliseconds. Tag, status and milestone colors are default,
          gray, brown, orange, yellow, green, blue, purple, pink or red.
          Milestone timeHorizon values are now, next_month, next_quarter,
          half_year, next_year and future.
        </DocsText>
        <DocsText>
          The queue defaults to open, under_review and planned, selects approved
          or internal items, excludes deleted, merged, session-proposal items
          and live claims, and matches any supplied tag. Claims last two hours
          and move feedback to in_progress. A claim is not a permanent lock:
          expiry alone does not reset the status. Claiming a specific ID does
          not apply the next-item status or approval filters.
        </DocsText>
        <DocsText>
          Changing lifecycle or custom status emits a status webhook; lifecycle
          changes can create or close a linked GitHub issue according to the
          integration settings. Publishing a release can notify subscribers;
          scheduling can also change the status of linked feedback. These are
          writes, not previews. Feedback/comment updates usually return{" "}
          {"{ success: true }"}. Duplicate resolve/merge, screenshot deletion
          and survey deletion return null; survey creation/duplication return a
          JSON ID string.
        </DocsText>
      </DocsSubsection>
      <DocsSubsection id="admin-survey-schema" title="Create a survey">
        <CodeBlock
          code={`curl "$REFLET_API_URL/api/v1/admin/survey/create" \\
  -H "Authorization: Bearer $REFLET_API_KEY" \\
  -H 'Content-Type: application/json' \\
  -d '{
    "title": "Checkout feedback",
    "triggerType": "event",
    "triggerConfig": { "eventName": "checkout_completed", "sampleRate": 50 },
    "display": { "frequency": "until_completed", "position": "bottom_right" },
    "questions": [
      { "type": "nps", "title": "Would you recommend us?", "required": true },
      { "type": "text", "title": "What should change?", "required": false }
    ],
    "endings": [{ "id": "thanks", "title": "Thanks for your feedback" }]
  }'`}
        />
        <DocsText>
          Each question has type, title, optional description, required (default
          true), config, logic and next. Types are nps, rating, text,
          single_choice, multiple_choice, boolean and statement. config accepts
          choices, allowOther, minValue, maxValue, minLabel, maxLabel,
          ratingStyle, maxLength, placeholder, buttonLabel and buttonUrl. Draft
          question jumps use {'{ kind: "question", questionIndex: 1 }'}; ending
          jumps use {'{ kind: "ending", endingId: "thanks" }'}. A logic rule has
          id, operator, optional value and target. Operators are equals,
          not_equals, greater_than, less_than, includes, answered and skipped.
          Use the dashboard editor for question editing after creation.
        </DocsText>
        <DocsText>
          triggerConfig accepts pageUrl, delayMs, eventName and sampleRate
          (0–100). display requires frequency (once, until_completed or
          recurring), with optional position (bottom_right, bottom_left or
          center) and recontactDays. Endings have id, title and optional
          description, buttonLabel and buttonUrl. Button URLs must be safe
          links. See{" "}
          <DocsLink href="/docs/sdk/surveys">
            survey rendering and flow
          </DocsLink>{" "}
          before writing a custom renderer.
        </DocsText>
      </DocsSubsection>
    </DocsSection>
  );
}
