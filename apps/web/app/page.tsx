import { redirect } from "next/navigation";

import Homepage from "@/features/homepage/components/homepage";
import { getToken } from "@/lib/auth-server";

/**
 * Root index route
 * - If logged in → redirect to /dashboard (which handles org selection)
 * - If not logged in → show homepage
 */
export default async function Index() {
  const token = await getToken();

  // If authenticated, redirect to dashboard
  if (token) {
    redirect("/dashboard");
  }

  // Otherwise, show homepage
  return <Homepage />;
}
