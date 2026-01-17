import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";
import { polar } from "./polar";

const http = httpRouter();

// Register Better Auth routes
authComponent.registerRoutes(http, createAuth);

// ============================================
// POLAR WEBHOOK HANDLER
// ============================================

// Register Polar webhook routes at /polar/events
// The component handles webhook signature verification and subscription sync
polar.registerRoutes(http);

export default http;
