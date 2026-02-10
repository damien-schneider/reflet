import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  avatarUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export const updateEmailSchema = z.object({
  newEmail: z.string().email("Invalid email"),
});

export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
  });

export type UpdateProfileForm = z.infer<typeof updateProfileSchema>;
export type UpdateEmailForm = z.infer<typeof updateEmailSchema>;
export type UpdatePasswordForm = z.infer<typeof updatePasswordSchema>;
