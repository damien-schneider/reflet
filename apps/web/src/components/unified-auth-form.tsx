"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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

// Schema for sign-up (email + password + name)
const signUpSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
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
  } = useForm<SignUpFormData>({
    resolver: zodResolver(mode === "signUp" ? signUpSchema : signInSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
  });

  const watchedEmail = watch("email");

  useEffect(() => {
    if (emailExistsData !== undefined && emailChecked) {
      const exists = emailExistsData.exists;
      setMode(exists ? "signIn" : "signUp");
      setIsCheckingEmail(false);
    }
  }, [emailExistsData, emailChecked]);

  const handleEmailBlur = () => {
    const currentEmail = watchedEmail.trim();

    // Only check if email is valid and different from last checked
    if (currentEmail?.includes("@") && currentEmail !== email) {
      setEmail(currentEmail);
      setIsCheckingEmail(true);
      setEmailChecked(true);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue("email", e.target.value);
    // Reset mode if user changes email significantly
    if (mode && emailChecked) {
      setMode(null);
      setEmailChecked(false);
    }
  };

  const onSubmit = async (data: SignUpFormData) => {
    if (!mode) {
      toast.error("Veuillez vérifier votre email");
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
            toast.error(
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
          name: data.name,
        },
        {
          onSuccess: async () => {
            onSuccess?.();
            try {
              const org = await ensurePersonalOrganization({
                name: data.name,
              });
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
            toast.error(
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
    return mode === "signIn" ? "Se connecter" : "Créer mon compte";
  };

  return (
    <div className="mx-auto w-full max-w-md p-6">
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
        {/* Email Field - Always visible */}
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            data-testid="email-input"
            id="email"
            type="email"
            {...register("email")}
            disabled={isSubmitting}
            onBlur={handleEmailBlur}
            onChange={handleEmailChange}
          />
          <FieldError errors={errors.email ? [errors.email] : undefined} />
          {isCheckingEmail && (
            <p className="text-muted-foreground text-sm">
              Vérification de l'email...
            </p>
          )}
        </Field>

        {/* Name Field - Only for sign-up */}
        <AnimatePresence>
          {mode === "signUp" && (
            <motion.div
              animate="animate"
              exit="exit"
              initial="initial"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              variants={animationVariants}
            >
              <Field>
                <FieldLabel htmlFor="name">Nom</FieldLabel>
                <Input
                  data-testid="name-input"
                  id="name"
                  {...register("name")}
                  disabled={isSubmitting}
                />
                <FieldError errors={errors.name ? [errors.name] : undefined} />
              </Field>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Password Field - Shown after email check */}
        <AnimatePresence>
          {mode && (
            <motion.div
              animate="animate"
              exit="exit"
              initial="initial"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              variants={animationVariants}
            >
              <Field>
                <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                <Input
                  data-testid="password-input"
                  id="password"
                  type="password"
                  {...register("password")}
                  disabled={isSubmitting}
                />
                <FieldError
                  errors={errors.password ? [errors.password] : undefined}
                />
              </Field>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button - Shown after email check */}
        <AnimatePresence>
          {mode && (
            <motion.div
              animate="animate"
              exit="exit"
              initial="initial"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              variants={animationVariants}
            >
              <Button
                className="w-full"
                disabled={isSubmitting || isCheckingEmail}
                type="submit"
              >
                {getButtonText()}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

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
