"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@reflet/backend/convex/_generated/api";
import { env } from "@reflet/env/web";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type UseFormReturn, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { capture } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import {
  formatAuthError,
  type SignUpFormData,
  signInSchema,
  signUpSchema,
} from "../lib/auth-validation";

export type AuthMode = "signIn" | "signUp" | null;

export interface UseAuthFormReturn {
  apiError: string | null;
  email: string;
  emailChecked: boolean;
  errors: ReturnType<typeof useForm<SignUpFormData>>["formState"]["errors"];
  handleEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: ReturnType<typeof useForm<SignUpFormData>>["handleSubmit"];
  isCheckingEmail: boolean;
  isSubmitting: boolean;
  mode: AuthMode;
  onSubmit: (data: SignUpFormData) => Promise<void>;
  passwordMismatchError: string | null;
  register: ReturnType<typeof useForm<SignUpFormData>>["register"];
  resetMode: () => void;
  setApiError: (error: string | null) => void;
  setValue: ReturnType<typeof useForm<SignUpFormData>>["setValue"];
  trigger: ReturnType<typeof useForm<SignUpFormData>>["trigger"];
  watchedConfirmPassword: string;
  watchedPassword: string;
}

const signInFormSchema = signInSchema.extend({ confirmPassword: z.string() });

export function useAuthForm(
  onSuccess?: () => void,
  redirectTo?: string
): UseAuthFormReturn {
  const router = useRouter();
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const form: UseFormReturn<SignUpFormData> = useForm<SignUpFormData>({
    defaultValues: { confirmPassword: "", email: "", password: "" },
    mode: "onChange",
    resolver: (data, context, options) =>
      zodResolver(mode === "signUp" ? signUpSchema : signInFormSchema)(
        data,
        context,
        options
      ),
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
    setFocus,
    setValue,
    trigger,
  } = form;

  const [watchedEmail, watchedPassword, watchedConfirmPassword] = useWatch({
    control,
    name: ["email", "password", "confirmPassword"],
  });
  const [debouncedEmail] = useDebouncedValue(watchedEmail, { wait: 800 });
  const email = isEditingEmail ? "" : debouncedEmail.trim();
  const emailChecked = email.includes("@");
  const emailExistsData = useQuery(
    api.auth.helpers.checkEmailExists,
    emailChecked ? { email } : "skip"
  );
  const isCheckingEmail = emailChecked && emailExistsData === undefined;
  const knownMode = emailExistsData?.exists ? "signIn" : "signUp";
  const mode: AuthMode = emailChecked && emailExistsData ? knownMode : null;

  useEffect(() => {
    if (mode === "signUp" && watchedPassword && watchedConfirmPassword) {
      trigger("confirmPassword");
    }
  }, [watchedPassword, mode, trigger, watchedConfirmPassword]);

  // While the confirmation is still a prefix of the password the user is mid-typing; don't flag it yet.
  const passwordsMismatch =
    mode === "signUp" &&
    watchedConfirmPassword.length > 0 &&
    !watchedPassword.startsWith(watchedConfirmPassword);
  const passwordMismatchError = passwordsMismatch
    ? "Passwords do not match"
    : null;

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiError(null);
    setIsEditingEmail(false);
    setValue("email", e.target.value);
  };

  const onSubmit = async (data: SignUpFormData) => {
    setApiError(null);

    if (!mode) {
      setApiError("Enter your email to continue");
      return;
    }

    if (mode === "signIn") {
      await authClient.signIn.email(
        {
          email: data.email,
          password: data.password,
        },
        {
          onError: (error) => {
            const message = error.error.message || error.error.statusText || "";
            const lowerMessage = message.toLowerCase();
            if (
              lowerMessage.includes("email not verified") ||
              lowerMessage.includes("verify your email")
            ) {
              onSuccess?.();
              router.push(
                `/auth/check-email?email=${encodeURIComponent(data.email)}`
              );
              return;
            }
            setApiError(
              formatAuthError(
                message ||
                  "Unable to sign in. Check your connection and try again."
              )
            );
            setFocus("password");
          },
          onSuccess: () => {
            capture("sign_in_completed", { method: "email" });
            onSuccess?.();
            router.push(redirectTo ?? "/pending-invitations");
          },
        }
      );
    } else {
      const placeholderName = data.email.split("@")[0] || "User";
      const skipEmailVerification =
        env.NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION === "true";

      await authClient.signUp.email(
        {
          callbackURL: redirectTo ?? "/auth/verify-email",
          email: data.email,
          name: placeholderName,
          password: data.password,
        },
        {
          onError: (error) => {
            setApiError(
              formatAuthError(
                error.error.message ||
                  error.error.statusText ||
                  "Unable to create your account. Check your connection and try again."
              )
            );
          },
          onSuccess: () => {
            capture("sign_up_completed", { method: "email" });
            onSuccess?.();
            router.push(
              skipEmailVerification
                ? (redirectTo ?? "/pending-invitations")
                : `/auth/check-email?email=${encodeURIComponent(data.email)}`
            );
          },
        }
      );
    }
  };

  const resetMode = () => {
    setIsEditingEmail(true);
    setValue("email", "");
    setFocus("email");
  };

  return {
    apiError,
    email,
    emailChecked,
    errors,
    handleEmailChange,
    handleSubmit,
    isCheckingEmail,
    isSubmitting,
    mode,
    onSubmit,
    passwordMismatchError,
    register,
    resetMode,
    setApiError,
    setValue,
    trigger,
    watchedConfirmPassword,
    watchedPassword,
  };
}
