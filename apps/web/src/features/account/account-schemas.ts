import { z } from "zod";

export const updateProfileSchema = z.object({
  avatarUrl: z
    .string()
    .url("Enter a full URL, starting with https://")
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, "Enter your name"),
});

export const updateEmailSchema = z.object({
  newEmail: z.string().email("Enter a valid email address"),
});

export const updatePasswordSchema = z
  .object({
    confirmPassword: z.string().min(1, "Re-enter your new password"),
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "Use at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don’t match",
    path: ["confirmPassword"],
  });

export type UpdateProfileForm = z.infer<typeof updateProfileSchema>;
export type UpdateEmailForm = z.infer<typeof updateEmailSchema>;
export type UpdatePasswordForm = z.infer<typeof updatePasswordSchema>;
