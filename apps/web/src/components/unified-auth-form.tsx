"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "motion/react";
import { useConvex } from "convex/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";

const authSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
  confirmPassword: z.string().optional(),
});

type AuthFormData = z.infer<typeof authSchema>;

export function UnifiedAuthForm() {
  const [step, setStep] = useState<"email" | "login" | "register">("email");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const convex = useConvex();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      confirmPassword: "",
    },
  });

  const { onBlur: onBlurEmail, ...restEmail } = register("email");

  const handleEmailBlur = async () => {
    const email = getValues("email");
    if (!email) return;

    // Manual validation to avoid full form validation trigger issues
    const emailSchema = z.string().email();
    if (!emailSchema.safeParse(email).success) return;

    setIsCheckingEmail(true);
    try {
      // @ts-ignore - API types are not generated in this environment
      const exists = await Promise.race([
        convex.query(api.user_checks.checkEmail, { email }),
        new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 5000)
        ),
      ]);
      setStep(exists ? "login" : "register");
    } catch (error) {
      console.error(error);
      setStep("login");
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const onSubmit = async (data: AuthFormData) => {
    if (step === "email") {
      await handleEmailBlur();
      return;
    }

    if (step === "login") {
      await authClient.signIn.email({
        email: data.email,
        password: data.password,
      }, {
        onSuccess: () => {
          router.push("/dashboard");
          toast.success("Welcome back!");
        },
        onError: (ctx) => {
          toast.error(ctx.error.message);
        }
      });
    } else {
      if (data.password !== data.confirmPassword) {
        setError("confirmPassword", { message: "Passwords do not match" });
        return;
      }
      if (!data.name) {
        setError("name", { message: "Name is required" });
        return;
      }

      await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
      }, {
        onSuccess: () => {
          router.push("/dashboard");
          toast.success("Account created successfully!");
        },
        onError: (ctx) => {
          toast.error(ctx.error.message);
        }
      });
    }
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <motion.h2
          key={step}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          initial={{ opacity: 0, y: -20 }}
          className="mt-6 text-3xl font-bold tracking-tight"
        >
          {step === "register"
            ? "Create an account"
            : step === "login"
            ? "Welcome back"
            : "Sign in"}
        </motion.h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {step === "register"
            ? "Enter your details to get started"
            : step === "login"
            ? "Enter your password to continue"
            : "Enter your email to continue"}
        </p>
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <Field>
            <FieldLabel htmlFor="email">Email address</FieldLabel>
            <div className="relative mt-2">
              <Input
                autoComplete="email"
                className={errors.email ? "border-red-500" : ""}
                disabled={step !== "email" && isSubmitting}
                id="email"
                type="email"
                {...restEmail}
                onBlur={(e) => {
                  onBlurEmail(e);
                  handleEmailBlur();
                }}
              />
              {isCheckingEmail && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <FieldError errors={[{ message: errors.email?.message }]} />
          </Field>

          <AnimatePresence mode="popLayout">
            {step === "register" && (
              <motion.div
                animate={{ opacity: 1, height: "auto" }}
                className="overflow-hidden"
                exit={{ opacity: 0, height: 0 }}
                initial={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Field className="mt-2">
                    <FieldLabel htmlFor="name">Full Name</FieldLabel>
                    <Input
                      autoComplete="name"
                      className="mt-2"
                      disabled={isSubmitting}
                      id="name"
                      type="text"
                      {...register("name")}
                    />
                    <FieldError errors={[{ message: errors.name?.message }]} />
                </Field>
              </motion.div>
            )}

            {step !== "email" && (
              <motion.div
                animate={{ opacity: 1, height: "auto" }}
                className="overflow-hidden"
                exit={{ opacity: 0, height: 0 }}
                initial={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Field className="mt-2">
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      autoComplete={step === "login" ? "current-password" : "new-password"}
                      className="mt-2"
                      disabled={isSubmitting}
                      id="password"
                      type="password"
                      {...register("password")}
                    />
                    <FieldError errors={[{ message: errors.password?.message }]} />
                </Field>
              </motion.div>
            )}

            {step === "register" && (
              <motion.div
                animate={{ opacity: 1, height: "auto" }}
                className="overflow-hidden"
                exit={{ opacity: 0, height: 0 }}
                initial={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Field className="mt-2">
                    <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                    <Input
                      autoComplete="new-password"
                      className="mt-2"
                      disabled={isSubmitting}
                      id="confirmPassword"
                      type="password"
                      {...register("confirmPassword")}
                    />
                    <FieldError errors={[{ message: errors.confirmPassword?.message }]} />
                </Field>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || isCheckingEmail}
          className="w-full"
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {step === "email" ? "Continue" : step === "login" ? "Sign in" : "Create account"}
        </Button>
      </form>
    </div>
  );
}
