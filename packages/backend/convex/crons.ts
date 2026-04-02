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

crons.daily(
  "run intelligence scans",
  { hourUTC: 6, minuteUTC: 0 },
  internal.intelligence.crons.runScheduledScans
);

crons.weekly(
  "send intelligence digest",
  { dayOfWeek: "monday", hourUTC: 10, minuteUTC: 0 },
  internal.intelligence.notifications.sendAllIntelligenceDigests
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
  "autopilot orchestrator",
  { minutes: 2 },
  internal.autopilot.crons.runOrchestrator
);

crons.daily(
  "autopilot daily CEO report",
  { hourUTC: 8, minuteUTC: 0 },
  internal.autopilot.crons.runDailyCEOReports
);

crons.weekly(
  "autopilot weekly CEO report",
  { dayOfWeek: "monday", hourUTC: 9, minuteUTC: 30 },
  internal.autopilot.crons.runWeeklyCEOReports
);

crons.daily(
  "autopilot daily security scan",
  { hourUTC: 7, minuteUTC: 0 },
  internal.autopilot.crons.runDailySecurityScans
);

crons.weekly(
  "autopilot weekly architect review",
  { dayOfWeek: "wednesday", hourUTC: 8, minuteUTC: 0 },
  internal.autopilot.crons.runWeeklyArchitectReviews
);

crons.daily(
  "autopilot inbox expiration",
  { hourUTC: 1, minuteUTC: 0 },
  internal.autopilot.crons.runInboxExpiration
);

crons.daily(
  "autopilot cost reset",
  { hourUTC: 0, minuteUTC: 0 },
  internal.autopilot.cost_guard.resetDailyCounters
);

export default crons;
