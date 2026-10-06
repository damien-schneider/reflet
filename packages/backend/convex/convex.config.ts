import agent from "@convex-dev/agent/convex.config";
import betterAuth from "@convex-dev/better-auth/convex.config";
import migrations from "@convex-dev/migrations/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import resend from "@convex-dev/resend/convex.config";
import shardedCounter from "@convex-dev/sharded-counter/convex.config";
import stripe from "@convex-dev/stripe/convex.config.js";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(betterAuth);
app.use(agent);
app.use(stripe);
app.use(rateLimiter);
app.use(resend);
app.use(resend, { name: "supportResend" });
app.use(shardedCounter);
app.use(migrations);

export default app;
