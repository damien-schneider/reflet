"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import {
  formatAuthError,
  type SignUpFormData,
  signInSchema,
  signUpSchema,
} from "../lib/auth-validation";

export type AuthMode = "signIn" | "signUp" | null;

export interface UseAuthFormReturn {
  email: string;
  setEmail: (email: string) => void;
  emailChecked: boolean;
  isCheckingEmail: boolean;
  mode: AuthMode;
  apiError: string | null;
  setApiError: (error: string | null) => void;
  passwordMismatchError: string | null;
  setPasswordMismatchError: (error: string | null) => void;
  register: ReturnType<typeof useForm<SignUpFormData>>["register"];
  handleSubmit: ReturnType<typeof useForm<SignUpFormData>>["handleSubmit"];
  errors: ReturnType<typeof useForm<SignUpFormData>>["formState"]["errors"];
  isSubmitting: boolean;
  watch: ReturnType<typeof useForm<SignUpFormData>>["watch"];
  setValue: ReturnType<typeof useForm<SignUpFormData>>["setValue"];
  trigger: ReturnType<typeof useForm<SignUpFormData>>["trigger"];
  onSubmit: (data: SignUpFormData) => Promise<void>;
  handleEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  resetMode: () => void;
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
    api.auth_helpers.checkEmailExists,
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
    resolver: async (data, context, options) => {
      try {
        const result = await zodResolver(
          mode === "signUp" ? signUpSchema : signInSchema
        )(data, context, options);
        return result;
      } catch {
        return { errors: {}, values: data };
      }
    },
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: watchedPassword triggers revalidation intentionally
  useEffect(() => {
    if (mode === "signUp" && watchedConfirmPassword) {
      trigger("confirmPassword");
    }
  }, [watchedPassword, mode, trigger, watchedConfirmPassword]);

  useEffect(() => {
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
  }, [mode, watchedPassword, watchedConfirmPassword]);

  useEffect(() => {
    if (emailExistsData !== undefined && emailChecked) {
      const exists = emailExistsData.exists;
      setMode(exists ? "signIn" : "signUp");
      setIsCheckingEmail(false);
      setLastCheckedEmail(email);
    }
  }, [emailExistsData, emailChecked, email]);

  useEffect(() => {
    const currentEmail = debouncedEmail.trim();

    if (currentEmail?.includes("@") && currentEmail !== lastCheckedEmail) {
      setEmail(currentEmail);
      setIsCheckingEmail(true);
      setEmailChecked(true);
    }
  }, [debouncedEmail, lastCheckedEmail]);

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
            onSuccess?.();
            router.push("/dashboard");
            toast.success("Successfully signed in");
          },
          onError: (error) => {
            setApiError(
              formatAuthError(
                error.error.message || error.error.statusText || "Sign in error"
              )
            );
          },
        }
      );
    } else {
      const placeholderName = data.email.split("@")[0] || "User";
      const skipEmailVerification =
        process.env.NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION === "true";

      await authClient.signUp.email(
        {
          email: data.email,
          password: data.password,
          name: placeholderName,
          callbackURL: "/auth/verify-email",
        },
        {
          onSuccess: () => {
            onSuccess?.();
            if (skipEmailVerification) {
              router.push("/dashboard");
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
