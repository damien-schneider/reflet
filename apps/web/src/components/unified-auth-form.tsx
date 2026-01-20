"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { Field, FieldError, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";

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

export default function UnifiedAuthForm({ onSuccess }: UnifiedAuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [emailChecked, setEmailChecked] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [mode, setMode] = useState<"signIn" | "signUp" | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastCheckedEmail, setLastCheckedEmail] = useState<string>("");

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
    formState: { errors, isSubmitting, isValid },
    watch,
    setValue,
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
    mode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const watchedEmail = watch("email");
  const [debouncedEmail] = useDebouncedValue(watchedEmail, { wait: 800 });

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
              error.error.message ||
                error.error.statusText ||
                "Erreur de connexion"
            );
          },
        }
      );
    } else {
      await authClient.signUp.email(
        {
          email: data.email,
          password: data.password,
          name: "",
        },
        {
          onSuccess: async () => {
            onSuccess?.();
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
          },
          onError: (error) => {
            setApiError(
              error.error.message ||
                error.error.statusText ||
                "Erreur d'inscription"
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
    return isValid;
  };

  return (
    <div className="absolute top-[35%] left-1/2 w-full max-w-md -translate-x-1/2 p-6">
      <AnimatePresence mode="wait">
        <motion.div
          animate="animate"
          exit="exit"
          initial="initial"
          key={mode || "initial"}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          variants={titleVariants}
        >
          <h1 className="mb-2 text-center font-bold text-3xl">{getTitle()}</h1>
          <p className="mb-6 text-center text-muted-foreground text-sm">
            {getDescription()}
          </p>
        </motion.div>
      </AnimatePresence>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="relative mb-4">
          <FieldError
            className="absolute top-0 left-0"
            errors={apiError ? [{ message: apiError }] : undefined}
          />
        </div>
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
            onChange={() => setApiError(null)}
          />
          <FieldError
            className="absolute top-full left-0"
            errors={errors.password ? [errors.password] : undefined}
          />
        </Field>

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
                  onChange={() => setApiError(null)}
                />
                <FieldError
                  className="absolute top-full left-0"
                  errors={
                    errors.confirmPassword
                      ? [errors.confirmPassword]
                      : undefined
                  }
                />
              </Field>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button - Always visible */}
        <Button
          className="w-full"
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
                      className="font-medium text-primary hover:underline"
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
                      className="font-medium text-primary hover:underline"
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
