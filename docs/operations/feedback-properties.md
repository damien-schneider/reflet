# Feedback properties and publication

Use this reference when investigating a mismatched board column, pending submission, or AI triage result. The implementation lives in `packages/backend/convex/feedback`, with lifecycle definitions in `organizations/status_definitions.ts`.

## Lifecycle and board columns

Feedback stores both its fixed `status` and an `organizationStatusId`. Each organization column has a required `semanticStatus`; changing its display name does not change that meaning.

| Stored status | Default label |
| --- | --- |
| `open` | Backlog |
| `under_review` | Under Review |
| `planned` | Planned |
| `in_progress` | In Progress |
| `completed` | Done |
| `closed` | Closed |

Columns sort in this lifecycle order, then by their stored `order` within the same meaning. New organizations start with Backlog, Planned, In Progress, and Done, not all six columns.

`status_target.ts` selects the first matching column or creates one if needed. `resolveStatusTarget` rejects a cleared column, a column from another organization, or a supplied status that disagrees with the column. Use the status mutations rather than patching either stored field independently. New feedback uses the organization's `feedbackSettings.defaultStatus`, falling back to `open`.

## Publication is separate from lifecycle

Publication is one of `internal`, `pending`, `approved`, or `rejected`. Internal audience takes precedence over approval; rejected publication takes precedence over the approval flag. Public feedback must be approved and not soft-deleted. Reaching Done does not publish an item.

Normal web and external feedback submissions start unapproved and schedule asynchronous triage. Internal submissions remain internal. Triage can approve an unreviewed pending submission, but it does not override a human audience or publication decision.

- A junk probability of at least `0.5` holds the submission pending and recommends rejection. Triage does not archive or delete it.
- Otherwise, the organization's `feedbackSettings.requireApproval` determines whether it stays pending or is approved.
- If triage fails, including when `OPENROUTER_API_KEY` is missing, the same approval policy applies without the junk verdict. Missing AI configuration alone does not force every submission to remain pending.

Admins and owners can change publication. Explicit rejection uses the existing soft-delete path, so the item moves to Trash. Restoration clears the deletion fields, not the rejected publication state; change publication after restoring if the item should become public. Secret-key API reads can include pending feedback and expose its `publication` state. The admin API changes it through `POST /api/v1/admin/feedback/publication`.

## Inspect a triage run

`feedbackTriageRuns` records the actual title/description, category snapshot, questions and criteria, model, thresholds, probabilities, decisions, timestamps, and errors. The member-only `triage_runs.list` query returns the ten most recent runs for an item. Do not infer a historical run from a legacy score.

The current assessment, called JEV in the interface, estimates usefulness, junk, need for clarification, and category matches. It does not estimate implementation complexity or time. Category suggestions require probability `0.65` and select at most three; clarification uses `0.75`. Each run stores the thresholds used, so inspect that snapshot rather than assuming today's constants applied to an older run.

Only the latest run can apply to a live item with unchanged title/description. Results for deleted feedback or superseded runs are discarded. An edited submission causes a moderating run to be scheduled again against the new input. Failed runs store their error and apply the publication fallback where still applicable.

If a submission appears stuck, inspect its publication decision, the organization's approval setting, the latest run's status/error, and the scheduled function logs. A successful run can intentionally leave an item pending.

## Human decisions and category visibility

Human property values take precedence over AI values. For nullable properties, an explicit `null` clears the effective value; resetting the human override permits an available AI value again. A teammate responsible for an item is not the same as an agent's temporary claim.

Triage preserves manually applied categories and excluded AI suggestions. It considers the project's categories regardless of their public audience. Category visibility does not set lifecycle or publication: only `settings.isPublic === true` exposes a category to visitors. Missing audience configuration is private; organization members can see team categories. Do not use old per-category approval, default-status, or roadmap settings as publication controls.

## Source map

- Lifecycle: `organizations/status_definitions.ts`, `feedback/status_target.ts`, `feedback/status_change.ts`.
- Property precedence and visibility: `feedback/property_values.ts`, `feedback/categories/audience.ts`, `feedback/categories/visibility.ts`.
- Publication: `feedback/publication.ts`, `feedback/triage_publication.ts`, `feedback/actions.ts`.
- Triage: `feedback/auto_tagging_actions.ts`, `feedback/triage_runs.ts`, `feedback/triage_questions.ts`.

Paths above are relative to `packages/backend/convex`. There is no reconciliation endpoint to run as part of a deployment; the schema already requires column meanings. Review any data migration separately rather than attempting to replay an old runbook.
