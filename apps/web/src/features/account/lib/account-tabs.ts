import { z } from "zod";

export const ACCOUNT_NAV_ITEMS = [
  { id: "profile", label: "Profile" },
  { id: "email", label: "Email" },
  { id: "password", label: "Password" },
  { id: "notifications", label: "Notifications" },
  { id: "devtools", label: "Devtools" },
] as const;

export const accountTabSchema = z.enum(ACCOUNT_NAV_ITEMS.map(({ id }) => id));
export type AccountTab = z.infer<typeof accountTabSchema>;
