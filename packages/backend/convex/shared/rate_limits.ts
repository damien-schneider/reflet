import { DAY, HOUR, MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  aiGenerationPerOrg: {
    capacity: 60,
    kind: "token bucket",
    period: DAY,
    rate: 300,
  },
  aiGenerationPerUser: {
    capacity: 20,
    kind: "token bucket",
    period: HOUR,
    rate: 60,
  },
  anonymousFeedbackPerOrg: {
    capacity: 20,
    kind: "token bucket",
    period: HOUR,
    rate: 60,
  },
  authPasswordResetPerEmail: {
    capacity: 3,
    kind: "token bucket",
    period: HOUR,
    rate: 3,
  },
  authSignInPerEmail: {
    capacity: 10,
    kind: "token bucket",
    period: 15 * MINUTE,
    rate: 10,
  },
  authSignUpPerEmail: {
    capacity: 5,
    kind: "token bucket",
    period: HOUR,
    rate: 5,
  },
  authVerificationEmailPerEmail: {
    capacity: 3,
    kind: "token bucket",
    period: HOUR,
    rate: 3,
  },
  competitorScrapePerOrg: {
    capacity: 10,
    kind: "token bucket",
    period: DAY,
    rate: 20,
  },
  emailSubscriptionPerOrg: {
    capacity: 20,
    kind: "token bucket",
    period: HOUR,
    rate: 60,
  },
  intelligenceScanPerOrg: {
    capacity: 3,
    kind: "token bucket",
    period: DAY,
    rate: 5,
  },
  invitationEmailPerOrg: {
    capacity: 20,
    kind: "token bucket",
    period: DAY,
    rate: 50,
  },
  invitationEmailPerUser: {
    capacity: 20,
    kind: "token bucket",
    period: DAY,
    rate: 50,
  },
  publicApiScreenshotUploadPerPublicKey: {
    capacity: 300,
    kind: "token bucket",
    period: MINUTE,
    rate: 300,
  },
  publicApiSurveyStartPerPublicKey: {
    capacity: 600,
    kind: "token bucket",
    period: MINUTE,
    rate: 600,
  },
  publicApiWritePerPublicKey: {
    capacity: 30,
    kind: "token bucket",
    period: MINUTE,
    rate: 30,
  },
  publicApiWritePerSecretKey: {
    capacity: 300,
    kind: "token bucket",
    period: MINUTE,
    rate: 300,
  },
  subscriptionConfirmationPerEmail: {
    capacity: 3,
    kind: "token bucket",
    period: DAY,
    rate: 5,
  },
  widgetConversationPerVisitor: {
    capacity: 5,
    kind: "token bucket",
    period: HOUR,
    rate: 10,
  },
  widgetConversationPerWidget: {
    capacity: 100,
    kind: "token bucket",
    period: HOUR,
    rate: 300,
  },
  widgetMessagePerVisitor: {
    capacity: 10,
    kind: "token bucket",
    period: MINUTE,
    rate: 30,
  },
  widgetMessagePerWidget: {
    capacity: 200,
    kind: "token bucket",
    period: HOUR,
    rate: 2000,
  },
});
