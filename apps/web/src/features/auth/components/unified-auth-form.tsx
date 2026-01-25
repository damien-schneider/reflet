"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { H1, Muted } from "@/components/ui/typography";
import { authClient } from "@/lib/auth-client";

// Schema for sign-in (email + password)
const signInSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

// Schema for sign-up (email + password + confirm password)
const signUpSchema = z
  .object({
    email: z.string().email("Adresse email invalide"),
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    confirmPassword: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type SignUpFormData = z.infer<typeof signUpSchema>;

interface UnifiedAuthFormProps {
  onSuccess?: () => void;
}

const animationVariants = {
  initial: { opacity: 0, height: 0, marginBottom: 0 },
  animate: { opacity: 1, height: "auto", marginBottom: 16 },
  exit: { opacity: 0, height: 0, marginBottom: 0 },
};

const titleVariants = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
};

const BODY_FIELD_REGEX = /\[body\.(.*?)\]/;

const formatAuthError = (message: string): string => {
  if (!message) {
    return "";
  }

  // Better Auth validation errors often look like: "[body.email] Invalid email"
  let cleaned = message;

  // Field mapping for French localization
  const fieldMap: Record<string, string> = {
    email: "L'email",
    password: "Le mot de passe",
  };

  // Replace [body.fieldName] with the readable field name
  cleaned = cleaned.replace(BODY_FIELD_REGEX, (_, field) => {
    const label = fieldMap[field] || field;
    return `${label}`;
  });

  // Localize common validation messages
  const lowerCleaned = cleaned.toLowerCase();

  if (lowerCleaned.includes("invalid email")) {
    return "Adresse email invalide";
  }

  if (lowerCleaned.includes("incorrect email or password")) {
    return "Email ou mot de passe incorrect";
  }

  if (lowerCleaned.includes("user already exists")) {
    return "Un compte avec cet email existe déjà";
  }

  if (
    lowerCleaned.includes("email not verified") ||
    lowerCleaned.includes("verify your email")
  ) {
    return "Veuillez vérifier votre email avant de vous connecter.";
  }

  if (
    lowerCleaned.includes("too small") ||
    lowerCleaned.includes("expected string")
  ) {
    if (cleaned.includes("L'email")) {
      return "L'email est requis";
    }
    if (cleaned.includes("Le mot de passe")) {
      return "Le mot de passe est requis";
    }
    return "Ce champ est requis";
  }

  return cleaned;
};

export default function UnifiedAuthForm({ onSuccess }: UnifiedAuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [emailChecked, setEmailChecked] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [mode, setMode] = useState<"signIn" | "signUp" | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastCheckedEmail, setLastCheckedEmail] = useState<string>("");
  const [passwordMismatchError, setPasswordMismatchError] = useState<
    string | null
  >(null);

  const ensurePersonalOrganization = useMutation(
    api.organizations_personal.ensurePersonalOrganization
  );

  // Check if email exists when user blurs the email field
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

  // Revalidate confirmPassword when password changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: watchedPassword triggers revalidation intentionally
  useEffect(() => {
    if (mode === "signUp" && watchedConfirmPassword) {
      trigger("confirmPassword");
    }
  }, [watchedPassword, mode, trigger, watchedConfirmPassword]);

  // Ensure validation errors are visible when passwords don't match
  // This covers the case where user types rapidly without triggering blur events
  // We use local state to guarantee the error is always displayed
  useEffect(() => {
    if (mode !== "signUp") {
      setPasswordMismatchError(null);
      return;
    }

    const hasConfirmPassword = watchedConfirmPassword.length > 0;
    const passwordsMatch = watchedPassword === watchedConfirmPassword;

    if (hasConfirmPassword && !passwordsMatch) {
      setPasswordMismatchError("Les mots de passe ne correspondent pas");
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
      setApiError("Veuillez vérifier votre email");
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
            toast.success("Connexion réussie");
          },
          onError: (error) => {
            setApiError(
              formatAuthError(
                error.error.message ||
                  error.error.statusText ||
                  "Erreur de connexion"
              )
            );
          },
        }
      );
    } else {
      // Better Auth requires a non-empty name; use email prefix as placeholder
      // The user can update their name later in account settings
      const placeholderName = data.email.split("@")[0] || "Utilisateur";
      await authClient.signUp.email(
        {
          email: data.email,
          password: data.password,
          name: placeholderName,
          callbackURL: "/auth/verify-email",
        },
        {
          onSuccess: async () => {
            onSuccess?.();

            // Check if user is signed in (only happens in dev without email verification)
            const session = await authClient.getSession();
            if (session?.data?.user) {
              // User is signed in - dev mode or email already verified
              try {
                const org = await ensurePersonalOrganization({});
                if (org?.slug) {
                  router.push(`/dashboard/${org.slug}`);
                } else {
                  router.push("/dashboard");
                }
              } catch {
                router.push("/dashboard");
              }
              toast.success("Inscription réussie");
            } else {
              // User not signed in - email verification required (production)
              router.push(
                `/auth/check-email?email=${encodeURIComponent(data.email)}`
              );
              toast.success(
                "Inscription réussie. Vérifiez votre email pour activer votre compte."
              );
            }
          },
          onError: (error) => {
            setApiError(
              formatAuthError(
                error.error.message ||
                  error.error.statusText ||
                  "Erreur d'inscription"
              )
            );
          },
        }
      );
    }
  };

  const getTitle = () => {
    if (!mode) {
      return "Authentification";
    }
    return mode === "signIn" ? "Bon retour parmi nous" : "Créer un compte";
  };

  const getDescription = () => {
    if (!mode) {
      return "Entrez votre email pour continuer";
    }
    return mode === "signIn"
      ? "Connectez-vous avec votre email et mot de passe"
      : "Complétez les informations pour créer votre compte";
  };

  const getButtonText = () => {
    if (isSubmitting) {
      return "Chargement...";
    }
    if (!mode) {
      return "Continuer";
    }
    return mode === "signIn" ? "Se connecter" : "Créer mon compte";
  };

  const isFormValid = () => {
    const hasErrors = Object.keys(errors).length > 0;
    if (hasErrors) {
      return false;
    }

    if (mode === "signUp") {
      return (
        watchedPassword.length >= 8 &&
        watchedConfirmPassword.length >= 8 &&
        watchedPassword === watchedConfirmPassword
      );
    }

    return watchedPassword.length >= 8;
  };

  const getConfirmPasswordErrors = ():
    | Array<{ message?: string }>
    | undefined => {
    if (passwordMismatchError) {
      return [{ message: passwordMismatchError }];
    }
    if (errors.confirmPassword) {
      return [errors.confirmPassword];
    }
    return undefined;
  };

  return (
    <div className="w-full max-w-md p-6">
      <AnimatePresence mode="wait">
        <motion.div
          animate="animate"
          exit="exit"
          initial="initial"
          key={mode || "initial"}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          variants={titleVariants}
        >
          <H1 className="mb-2 text-center" variant="page">
            {getTitle()}
          </H1>
          <Muted className="mb-6 text-center">{getDescription()}</Muted>
        </motion.div>
      </AnimatePresence>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        {/* Email Field - Always visible */}
        <Field className="relative">
          <FieldLabel className="justify-between" htmlFor="email">
            Email
            {isCheckingEmail && (
              <div className="inline-flex w-fit! gap-1 text-muted-foreground text-xs">
                <Spinner />

                <p className="">Vérification de l'email...</p>
              </div>
            )}
          </FieldLabel>
          <Input
            data-testid="email-input"
            id="email"
            type="email"
            {...register("email")}
            disabled={isSubmitting}
            onChange={handleEmailChange}
          />
          <FieldError
            className="absolute top-full left-0"
            errors={errors.email ? [errors.email] : undefined}
          />
        </Field>

        {/* Password Field - Always visible */}
        <Field className="relative">
          <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
          <Input
            data-testid="password-input"
            id="password"
            type="password"
            {...register("password")}
            disabled={isSubmitting}
            onChange={(e) => {
              setApiError(null);
              setValue("password", e.target.value);
              trigger("password");
            }}
          />
          <FieldError
            className="absolute top-full left-0"
            errors={errors.password ? [errors.password] : undefined}
          />
        </Field>

        {/* Forgot Password Link - Only for sign-in */}
        <AnimatePresence>
          {mode === "signIn" && (
            <motion.div
              animate="animate"
              className="text-right"
              exit="exit"
              initial="initial"
              transition={{ duration: 0.2, ease: "easeInOut" }}
              variants={animationVariants}
            >
              <a
                className="font-medium text-olive-600 text-sm hover:underline"
                href="/auth/forgot-password"
              >
                Mot de passe oublié ?
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirm Password Field - Only for sign-up */}
        <AnimatePresence>
          {mode === "signUp" && (
            <motion.div
              animate="animate"
              exit="exit"
              initial="initial"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              variants={animationVariants}
            >
              <Field className="relative">
                <FieldLabel htmlFor="confirmPassword">
                  Confirmer le mot de passe
                </FieldLabel>
                <Input
                  data-testid="confirm-password-input"
                  id="confirmPassword"
                  type="password"
                  {...register("confirmPassword")}
                  disabled={isSubmitting}
                  onChange={(e) => {
                    setApiError(null);
                    setValue("confirmPassword", e.target.value);
                    trigger("confirmPassword");
                  }}
                />
                <FieldError
                  className="absolute top-full left-0"
                  data-testid="confirm-password-error"
                  errors={getConfirmPasswordErrors()}
                />
              </Field>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button - Always visible */}
        {apiError && (
          <FieldError className="absolute" errors={[{ message: apiError }]} />
        )}
        <Button
          className="mt-6 w-full"
          data-testid="submit-button"
          disabled={isSubmitting || isCheckingEmail || !isFormValid()}
          type="submit"
        >
          {getButtonText()}
        </Button>

        {/* Helper text */}
        <AnimatePresence>
          {mode && (
            <motion.div
              animate="animate"
              className="text-center"
              exit="exit"
              initial="initial"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              variants={animationVariants}
            >
              <p className="text-muted-foreground text-sm">
                {mode === "signIn" ? (
                  <>
                    Vous n'avez pas de compte ?{" "}
                    <button
                      className="font-medium text-olive-600 hover:underline"
                      onClick={() => {
                        setMode(null);
                        setEmailChecked(false);
                        setEmail("");
                      }}
                      type="button"
                    >
                      Utiliser un autre email
                    </button>
                  </>
                ) : (
                  <>
                    Vous avez déjà un compte ?{" "}
                    <button
                      className="font-medium text-olive-600 hover:underline"
                      onClick={() => {
                        setMode(null);
                        setEmailChecked(false);
                        setEmail("");
                      }}
                      type="button"
                    >
                      Utiliser un autre email
                    </button>
                  </>
                )}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}
