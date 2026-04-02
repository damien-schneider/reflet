"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@reflet/backend/convex/_generated/api";
import { env } from "@reflet/env/web";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
  setEmail: (email: string) => void;
  setPasswordMismatchError: (error: string | null) => void;
  setValue: ReturnType<typeof useForm<SignUpFormData>>["setValue"];
  trigger: ReturnType<typeof useForm<SignUpFormData>>["trigger"];
  watch: ReturnType<typeof useForm<SignUpFormData>>["watch"];
}

export function useAuthForm(onSuccess?: () => void): UseAuthFormReturn {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [emailChecked, setEmailChecked] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [mode, setMode] = useState<AuthMode>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastCheckedEmail, setLastCheckedEmail] = useState<string>("");
  const [passwordMismatchError, setPasswordMismatchError] = useState<
    string | null
  >(null);

  const emailExistsData = useQuery(
    api.auth.helpers.checkEmailExists,
    emailChecked && email ? { email } : "skip"
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    trigger,
  } = useForm<SignUpFormData>({
    // Pass mode via context so resolver always gets current value
    context: { mode },
    resolver: (async (data, resolverContext, options) => {
      try {
        // Read mode from context (which updates on re-render) instead of closure
        const contextWithMode = resolverContext as
          | { mode: AuthMode }
          | undefined;
        const currentMode = contextWithMode?.mode;
        const schema = currentMode === "signUp" ? signUpSchema : signInSchema;
        const resolve = zodResolver(
          schema
        ) as unknown as Resolver<SignUpFormData>;
        return await resolve(data, resolverContext, options);
      } catch {
        return { errors: {}, values: data };
      }
    }) as Resolver<SignUpFormData>,
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const watchedEmail = watch("email");
  const watchedPassword = watch("password");
  const watchedConfirmPassword = watch("confirmPassword");
  const [debouncedEmail] = useDebouncedValue(watchedEmail, { wait: 800 });

  useEffect(
    function triggerConfirmPasswordValidation() {
      if (mode === "signUp" && watchedPassword && watchedConfirmPassword) {
        trigger("confirmPassword");
      }
    },
    [watchedPassword, mode, trigger, watchedConfirmPassword]
  );

  useEffect(
    function checkPasswordMismatch() {
      if (mode !== "signUp") {
        setPasswordMismatchError(null);
        return;
      }

      const hasConfirmPassword = watchedConfirmPassword.length > 0;
      const passwordsMatch = watchedPassword === watchedConfirmPassword;

      if (hasConfirmPassword && !passwordsMatch) {
        setPasswordMismatchError("Passwords do not match");
      } else {
        setPasswordMismatchError(null);
      }
    },
    [mode, watchedPassword, watchedConfirmPassword]
  );

  useEffect(
    function setAuthModeFromEmailCheck() {
      if (emailExistsData !== undefined && emailChecked) {
        const exists = emailExistsData.exists;
        setMode(exists ? "signIn" : "signUp");
        setIsCheckingEmail(false);
        setLastCheckedEmail(email);
      }
    },
    [emailExistsData, emailChecked, email]
  );

  useEffect(
    function triggerDebouncedEmailCheck() {
      const currentEmail = debouncedEmail.trim();

      if (currentEmail?.includes("@") && currentEmail !== lastCheckedEmail) {
        setEmail(currentEmail);
        setIsCheckingEmail(true);
        setEmailChecked(true);
      }
    },
    [debouncedEmail, lastCheckedEmail]
  );

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiError(null);
    setValue("email", e.target.value);
  };

  const onSubmit = async (data: SignUpFormData) => {
    setApiError(null);

    if (!mode) {
      setApiError("Please verify your email");
      return;
    }

    if (mode === "signIn") {
      await authClient.signIn.email(
        {
          email: data.email,
          password: data.password,
        },
        {
          onSuccess: () => {
            capture("sign_in_completed", { method: "email" });
            onSuccess?.();
            router.push("/pending-invitations");
          },
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
            setApiError(formatAuthError(message || "Sign in error"));
          },
        }
      );
    } else {
      const placeholderName = data.email.split("@")[0] || "User";
      const skipEmailVerification =
        env.NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION === "true";

      await authClient.signUp.email(
        {
          email: data.email,
          password: data.password,
          name: placeholderName,
          callbackURL: "/auth/verify-email",
        },
        {
          onSuccess: () => {
            capture("sign_up_completed", { method: "email" });
            onSuccess?.();
            if (skipEmailVerification) {
              router.push("/pending-invitations");
              toast.success("Successfully signed up.");
            } else {
              router.push(
                `/auth/check-email?email=${encodeURIComponent(data.email)}`
              );
              toast.success(
                "Successfully signed up. Check your email to activate your account."
              );
            }
          },
          onError: (error) => {
            setApiError(
              formatAuthError(
                error.error.message || error.error.statusText || "Sign up error"
              )
            );
          },
        }
      );
    }
  };

  const resetMode = () => {
    setMode(null);
    setEmailChecked(false);
    setEmail("");
  };

  return {
    email,
    setEmail,
    emailChecked,
    isCheckingEmail,
    mode,
    apiError,
    setApiError,
    passwordMismatchError,
    setPasswordMismatchError,
    register,
    handleSubmit,
    errors,
    isSubmitting,
    watch,
    setValue,
    trigger,
    onSubmit,
    handleEmailChange,
    resetMode,
  };
}
