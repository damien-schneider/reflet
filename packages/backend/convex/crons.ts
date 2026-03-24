import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "cleanup deleted feedback",
  { hourUTC: 3, minuteUTC: 0 },
  internal.feedback.cleanup.permanentlyDeleteOldFeedback
);

crons.daily(
  "archive stale feedback",
  { hourUTC: 4, minuteUTC: 0 },
  internal.feedback.stale.archiveStaleFeedback
);

crons.weekly(
  "send weekly team digest",
  { dayOfWeek: "monday", hourUTC: 9, minuteUTC: 0 },
  internal.notifications.weekly_digest.sendAllDigests
);

crons.interval(
  "check scheduled releases",
  { minutes: 5 },
  internal.changelog.scheduling.checkMissedScheduledReleases
);

crons.daily(
  "cleanup old email events",
  { hourUTC: 2, minuteUTC: 30 },
  internal.email.health.cleanupOldEvents
);

crons.daily(
  "abandon stale survey responses",
  { hourUTC: 5, minuteUTC: 0 },
  internal.surveys.mutations.abandonStaleResponses
);

export default crons;
