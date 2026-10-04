import { DocsLink } from "@/components/docs/docs-page";
import { InlineCode } from "@/components/ui/typography";
import { BASE_URL, type EndpointDefinition, param } from "./endpoint-data";

const READ_ACCESS = (
  <>
    Public or secret key. A public key only reads a public organization; a
    private one answers <InlineCode>403</InlineCode> unless you use the secret
    key.
  </>
);

const PRIVATE_FIELDS_ACCESS = (
  <>
    {READ_ACCESS} With the secret key the response also includes internal
    feedback, feedback still awaiting publication, and the private fields{" "}
    <InlineCode>context</InlineCode>, <InlineCode>assigneeId</InlineCode>,{" "}
    <InlineCode>claimedBy</InlineCode>,{" "}
    <InlineCode>githubIssueNumber</InlineCode>,{" "}
    <InlineCode>githubHtmlUrl</InlineCode>, <InlineCode>isInternal</InlineCode>,{" "}
    <InlineCode>publication</InlineCode> (<InlineCode>internal</InlineCode>,{" "}
    <InlineCode>pending</InlineCode>, <InlineCode>approved</InlineCode> or{" "}
    <InlineCode>rejected</InlineCode>) and{" "}
    <InlineCode>syncedFromGithub</InlineCode>. Add a{" "}
    <DocsLink href="#user-token">signed user token</DocsLink> to fill{" "}
    <InlineCode>hasVoted</InlineCode>.
  </>
);

const GET_CONFIG: EndpointDefinition = {
  access: READ_ACCESS,
  description:
    "Get the organization behind the key: name, branding, board settings, statuses and public tags.",
  id: "get-config",
  method: "GET",
  path: "/feedback",
  request: `curl "${BASE_URL}/feedback" \\
  -H "Authorization: Bearer fb_pub_xxx"`,
  response: `{
  "id": "k57e4b1n8q2x9c0r3t6w5y7z1m",
  "name": "Acme",
  "slug": "acme",
  "isPublic": true,
  "primaryColor": "#5b5bd6",
  "feedbackSettings": { "defaultView": "feed", "requireApproval": false },
  "statuses": [
    { "id": "kx71…", "name": "Backlog", "color": "#6b7280", "icon": "clock", "order": 0 },
    { "id": "kx72…", "name": "Planned", "color": "#3b82f6", "icon": "calendar", "order": 1 }
  ],
  "tags": [
    { "id": "kt31…", "name": "Bug", "slug": "bug", "color": "red" }
  ]
}`,
};

const LIST_FEEDBACK: EndpointDefinition = {
  access: PRIVATE_FIELDS_ACCESS,
  description:
    "List approved feedback. Pinned items come first, then the chosen sort.",
  id: "list-feedback",
  method: "GET",
  params: [
    param(
      "status",
      "string",
      "open, under_review, planned, in_progress, completed or closed."
    ),
    param("statusId", "string", "Only items in this custom status."),
    param("tagId", "string", "Only items with this tag."),
    param("search", "string", "Matches the title or description."),
    param(
      "pagePath",
      "string",
      "Only items reported from this page, e.g. /settings/billing."
    ),
    param("sortBy", "string", "votes (default), newest, oldest or comments."),
    param("limit", "number", "Items per page. Defaults to 50, at most 100."),
    param("offset", "number", "Items to skip. Defaults to 0."),
  ],
  path: "/feedback/list",
  request: `curl "${BASE_URL}/feedback/list?sortBy=newest&limit=10" \\
  -H "Authorization: Bearer fb_pub_xxx"`,
  response: `{
  "items": [
    {
      "id": "jd7f2k9m1qz8x4c6v0bn3t5w",
      "title": "Add dark mode",
      "description": "Please add a dark mode option.",
      "status": "planned",
      "organizationStatus": { "id": "kx72…", "name": "Planned", "color": "#3b82f6" },
      "tags": [{ "id": "kt31…", "name": "Feature", "slug": "feature", "color": "blue" }],
      "author": { "name": "Jane Doe", "isExternal": true },
      "voteCount": 42,
      "commentCount": 5,
      "hasVoted": false,
      "isPinned": false,
      "createdAt": 1756900000000,
      "updatedAt": 1757400000000
    }
  ],
  "total": 128,
  "hasMore": true
}`,
};

const GET_FEEDBACK: EndpointDefinition = {
  access: (
    <>
      {PRIVATE_FIELDS_ACCESS} A signed user token also fills{" "}
      <InlineCode>isSubscribed</InlineCode>.
    </>
  ),
  description: "Get one feedback item.",
  id: "get-feedback",
  method: "GET",
  params: [param("id", "string", "Required. The feedback ID.")],
  path: "/feedback/item",
  request: `curl "${BASE_URL}/feedback/item?id=jd7f2k9m1qz8x4c6v0bn3t5w" \\
  -H "Authorization: Bearer fb_pub_xxx"`,
  response: `{
  "id": "jd7f2k9m1qz8x4c6v0bn3t5w",
  "title": "Add dark mode",
  "description": "Please add a dark mode option.",
  "status": "planned",
  "organizationStatus": { "id": "kx72…", "name": "Planned", "color": "#3b82f6" },
  "tags": [],
  "author": null,
  "voteCount": 42,
  "commentCount": 5,
  "hasVoted": false,
  "isSubscribed": false,
  "isPinned": false,
  "createdAt": 1756900000000,
  "updatedAt": 1757400000000
}`,
};

const SIMILAR_FEEDBACK: EndpointDefinition = {
  access: READ_ACCESS,
  description:
    "Find up to 5 existing items with a similar title, to suggest before someone posts a duplicate.",
  id: "similar-feedback",
  method: "GET",
  params: [
    param(
      "title",
      "string",
      "The draft title. Under 3 characters returns an empty list."
    ),
  ],
  path: "/feedback/similar",
  request: `curl "${BASE_URL}/feedback/similar?title=dark%20mode" \\
  -H "Authorization: Bearer fb_pub_xxx"`,
  response: `[
  {
    "_id": "jd7f2k9m1qz8x4c6v0bn3t5w",
    "title": "Add dark mode",
    "status": "planned",
    "voteCount": 42
  }
]`,
};

const LIST_COMMENTS: EndpointDefinition = {
  access: (
    <>
      {READ_ACCESS} With the secret key, authors include their{" "}
      <InlineCode>email</InlineCode>.
    </>
  ),
  description:
    "List the comments on a feedback item, with replies nested under their parent.",
  id: "list-comments",
  method: "GET",
  params: [
    param("feedbackId", "string", "Required. The feedback ID."),
    param("sortBy", "string", "oldest (default) or newest."),
  ],
  path: "/feedback/comments",
  request: `curl "${BASE_URL}/feedback/comments?feedbackId=jd7f2k9m1qz8x4c6v0bn3t5w" \\
  -H "Authorization: Bearer fb_pub_xxx"`,
  response: `[
  {
    "id": "kc81…",
    "body": "This would be amazing!",
    "author": { "name": "Jane Doe", "isExternal": true },
    "isOfficial": false,
    "createdAt": 1756990000000,
    "updatedAt": 1756990000000,
    "replies": [
      {
        "id": "kc82…",
        "body": "It’s on the roadmap for next month.",
        "author": null,
        "isOfficial": true,
        "createdAt": 1757000000000,
        "updatedAt": 1757000000000
      }
    ]
  }
]`,
};

const GET_ROADMAP: EndpointDefinition = {
  access: READ_ACCESS,
  description:
    "Get the roadmap: one lane per status, in board order, with the approved feedback in each.",
  id: "get-roadmap",
  method: "GET",
  path: "/feedback/roadmap",
  request: `curl "${BASE_URL}/feedback/roadmap" \\
  -H "Authorization: Bearer fb_pub_xxx"`,
  response: `{
  "lanes": [
    {
      "id": "kx72…",
      "name": "In Progress",
      "slug": "in-progress",
      "color": "#8b5cf6",
      "items": [
        {
          "id": "jd7f2k9m1qz8x4c6v0bn3t5w",
          "title": "Add dark mode",
          "status": "in_progress",
          "voteCount": 42
        }
      ]
    }
  ]
}`,
};

const GET_CHANGELOG: EndpointDefinition = {
  access: READ_ACCESS,
  description:
    "Get published releases, newest first, with the feedback each one shipped.",
  id: "get-changelog",
  method: "GET",
  params: [
    param("limit", "number", "Releases to return. Defaults to 20, max 100."),
  ],
  path: "/feedback/changelog",
  request: `curl "${BASE_URL}/feedback/changelog?limit=5" \\
  -H "Authorization: Bearer fb_pub_xxx"`,
  response: `[
  {
    "id": "kr11…",
    "title": "Dark mode is here",
    "version": "v2.4.0",
    "description": "Dark mode now follows your system setting…",
    "publishedAt": 1757500000000,
    "items": [
      {
        "id": "jd7f2k9m1qz8x4c6v0bn3t5w",
        "title": "Add dark mode",
        "status": "completed"
      }
    ]
  }
]`,
};

export const FEEDBACK_READ_ENDPOINTS = [
  GET_CONFIG,
  LIST_FEEDBACK,
  GET_FEEDBACK,
  SIMILAR_FEEDBACK,
  LIST_COMMENTS,
] as const;

export const ROADMAP_CHANGELOG_ENDPOINTS = [
  GET_ROADMAP,
  GET_CHANGELOG,
] as const;
