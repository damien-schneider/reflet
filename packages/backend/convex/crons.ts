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
  internal.surveys.responses.abandonStaleResponses
);

crons.interval(
  "status health checks",
  { minutes: 1 },
  internal.status.healthCheck.runHealthChecks
);

crons.daily(
  "cleanup old status checks",
  { hourUTC: 3, minuteUTC: 30 },
  internal.status.healthCheck.cleanupOldChecks
);

crons.interval(
  "check pending domain verification",
  { minutes: 5 },
  internal.domains.crons.checkPendingDomains
);

// ============================================
// AUTOPILOT CRONS
// ============================================

crons.interval(
  "autopilot heartbeat",
  { minutes: 3 },
  internal.autopilot.heartbeat.runHeartbeat
);

crons.interval(
  "autopilot self-healing",
  { minutes: 10 },
  internal.autopilot.self_heal.runSelfHealing
);

crons.daily(
  "autopilot cost reset",
  { hourUTC: 0, minuteUTC: 0 },
  internal.autopilot.cost_guard.resetDailyCounters
);

crons.daily(
  "autopilot review expiration",
  { hourUTC: 1, minuteUTC: 0 },
  internal.autopilot.maintenance.runReviewExpiration
);

crons.daily(
  "autopilot knowledge staleness check",
  { hourUTC: 6, minuteUTC: 30 },
  internal.autopilot.maintenance.runKnowledgeStalenessCheck
);

crons.daily(
  "autopilot activity log cleanup",
  { hourUTC: 2, minuteUTC: 0 },
  internal.autopilot.maintenance.cleanupOldActivityLogs
);

crons.daily(
  "autopilot document archival",
  { hourUTC: 2, minuteUTC: 15 },
  internal.autopilot.maintenance.archiveStaleDocuments
);

export default crons;
