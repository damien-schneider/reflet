export const COMMAND_GROUPS = [
  {
    actions:
      "list, get, create, update, delete, restore, assign, status, tags, analysis",
    description:
      "Read and manage feedback. list supports --status, --status-id, --tag, --search, --sort, --limit and --offset. assign without a member user ID unassigns. status accepts a lifecycle value or custom status ID.",
    resource: "feedback",
  },
  {
    actions: "next, claim-next, claim, issue, comments, comment, vote",
    description:
      "Queue and GitHub work. next/claim-next accept --statuses and --tags as comma-separated lists; --as labels claims. comments reads a thread. comment and vote currently lack the signed-user token required by their backend routes and return 401.",
    resource: "feedback",
  },
  {
    actions: "update, delete, official",
    description:
      "Edit/delete an existing comment or set its official flag. update requires --body. official takes the positional value true or false.",
    resource: "comment",
  },
  {
    actions:
      "list, get, create, update, publish, unpublish, delete, link, schedule, cancel-schedule",
    description:
      "Manage drafts and publication. list supports --status all|draft|published, --limit and --offset. schedule requires --at and optionally --feedback-status. link takes release ID, feedback ID and optional link|unlink.",
    resource: "release",
  },
  {
    actions: "list, get, create, update, complete, delete, link",
    description:
      "Manage milestones. create requires --name, --color and --horizon. Horizons: now, next_month, next_quarter, half_year, next_year, future. list accepts --status all|active|completed|archived. link takes milestone ID, feedback ID and optional link|unlink.",
    resource: "milestone",
  },
  {
    actions: "list, create, update, delete",
    description:
      "Manage public/private tags. create requires --name and --color. create/update also accept --icon, --description and --public true|false.",
    resource: "tag",
  },
  {
    actions: "list, create, update, delete",
    description:
      "Manage custom board columns, not lifecycle names. create requires --name and --color; create/update accept --icon. The backend keeps at least one column per lifecycle state.",
    resource: "status",
  },
  {
    actions:
      "list, get, create, update, status, duplicate, delete, analytics, responses",
    description:
      "Manage surveys. create requires --title, --trigger and --questions JSON. update accepts settings, not question edits. status takes draft|active|paused|closed. responses supports --status, --limit and --cursor; output uses page, continueCursor and isDone.",
    resource: "survey",
  },
  {
    actions: "list, download, delete",
    description:
      "list/download take a feedback ID. download writes preferred annotated images to .reflet/screenshots/<feedbackId>/, or --out. delete takes a screenshot ID and deletes its stored images.",
    resource: "screenshot",
  },
  {
    actions: "list, resolve, merge",
    description:
      "resolve takes pair ID and confirm|reject, without merging. merge takes source and target feedback IDs, optionally --pair; copies votes/subscriptions, not comments/tags, and hides the merged source from lists.",
    resource: "duplicate",
  },
  {
    actions: "list",
    description: "List membership and user IDs for feedback assignment.",
    resource: "member",
  },
  {
    actions: "list, create, cancel",
    description:
      "create requires --email and --role member. Although the CLI parser accepts admin, the server rejects it. Creation checks seats and schedules an email subject to limits/suppression. cancel takes an invitation ID.",
    resource: "invitation",
  },
  {
    actions: "get, update",
    description:
      "Read settings or change --name, --public true|false, --color and --support true|false. Making an organization public changes board access.",
    resource: "org",
  },
  {
    actions: "config get; roadmap get; changelog list",
    description:
      "Read organization public config, roadmap and published releases through the public API with the CLI's secret key. changelog list accepts --limit. These projections are not a dump of internal board data.",
    resource: "config / roadmap / changelog",
  },
] as const;
