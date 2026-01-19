import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Spinner } from "./ui/spinner";

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignUpFormData = z.infer<typeof signUpSchema>;

interface SignUpFormProps {
  onSwitchToSignIn: () => void;
  onSuccess?: () => void;
}

export default function SignUpForm({
  onSwitchToSignIn,
  onSuccess,
}: SignUpFormProps) {
  const router = useRouter();
  const ensurePersonalOrganization = useMutation(
    api.organizations_personal.ensurePersonalOrganization
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
  });

  const onSubmit = async (data: SignUpFormData) => {
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
          toast.success("Sign up successful");
        },
        onError: (error) => {
          toast.error(error.error.message || error.error.statusText);
        },
      }
    );
  };

  return (
    <div className="mx-auto mt-10 w-full max-w-md p-6">
      <h1 className="mb-6 text-center font-bold text-3xl">Create Account</h1>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              aria-describedby={errors.name ? "name-error" : undefined}
              aria-invalid={!!errors.name}
              data-testid="name-input"
              id="name"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-red-500 text-sm" id="name-error" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              aria-describedby={errors.email ? "email-error" : undefined}
              aria-invalid={!!errors.email}
              data-testid="email-input"
              id="email"
              type="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-red-500 text-sm" id="email-error" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              aria-describedby={errors.password ? "password-error" : undefined}
              aria-invalid={!!errors.password}
              data-testid="password-input"
              id="password"
              type="password"
              {...register("password")}
            />
            {errors.password && (
              <p
                className="text-red-500 text-sm"
                id="password-error"
                role="alert"
              >
                {errors.password.message}
              </p>
            )}
          </div>
        </div>

        <Button className="w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? (
            <>
              <Spinner className="mr-2" />
              Signing Up...
            </>
          ) : (
            "Sign Up"
          )}
        </Button>
      </form>

      <div className="mt-4 text-center">
        <Button
          className="text-indigo-600 hover:text-indigo-800"
          onClick={onSwitchToSignIn}
          variant="link"
        >
          Already have an account? Sign In
        </Button>
      </div>
    </div>
  );
}
