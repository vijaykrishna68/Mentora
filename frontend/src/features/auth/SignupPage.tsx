import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Field, Input, Tabs } from "@/components/ui";
import { isApiError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/api/queryKeys";
import { paths } from "@/app/router/paths";
import type { User } from "@/types";
import { AuthLayout } from "./AuthLayout";
import { useRegister } from "./useAuthMutations";
import { registerFormSchema, type RegisterFormValues, type RegisterInput } from "./schemas";

export function SignupPage() {
  const registerMutation = useRegister();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [role, setRole] = useState<RegisterFormValues["role"]>("CUSTOMER");

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { role: "CUSTOMER" },
  });

  function onSubmit(values: RegisterFormValues) {
    const payload: RegisterInput =
      values.role === "MENTOR"
        ? { role: "MENTOR", email: values.email, password: values.password, name: values.name }
        : { role: "CUSTOMER", email: values.email, password: values.password, name: values.name };

    registerMutation.mutate(payload, {
      onSuccess: async ({ user }) => {
        // A data-router `navigate()` runs as a transition and resolves
        // asynchronously — see the comment in useAuthMutations.ts. Awaiting
        // it here means the route has actually finished changing (GuestOnly
        // has unmounted) before we write the authenticated user into the
        // session cache, so GuestOnly's own reactive redirect never gets a
        // chance to fire and send a new mentor to the dashboard instead of
        // onboarding.
        const target = user.role === "MENTOR" ? paths.mentorSetup : paths.discover;
        await navigate(target, { replace: true });
        queryClient.setQueryData<{ user: User }>(queryKeys.auth.session, { user });
      },
      onError: (error) => {
        const message = isApiError(error) ? error.message : "Something went wrong. Please try again.";
        setError("root", { message });
      },
    });
  }

  return (
    <AuthLayout
      title="Create your account"
      description="Join Mentora as a customer or a mentor."
      footer={
        <>
          Already have an account?{" "}
          <Link to={paths.login} className="font-semibold text-pine underline underline-offset-2">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div>
          <span className="mb-1.5 block text-xs font-semibold text-charcoal-2">I am a</span>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <Tabs
                label="Account type"
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  setRole(value as RegisterFormValues["role"]);
                }}
                items={[
                  { value: "CUSTOMER", label: "Customer" },
                  { value: "MENTOR", label: "Mentor" },
                ]}
              />
            )}
          />
        </div>

        <Field label="Full name" error={errors.name?.message} required>
          {(fieldProps) => <Input autoComplete="name" {...fieldProps} {...register("name")} />}
        </Field>
        <Field label="Email" error={errors.email?.message} required>
          {(fieldProps) => <Input type="email" autoComplete="email" {...fieldProps} {...register("email")} />}
        </Field>
        <Field label="Password" hint="At least 8 characters." error={errors.password?.message} required>
          {(fieldProps) => (
            <Input type="password" autoComplete="new-password" {...fieldProps} {...register("password")} />
          )}
        </Field>

        {errors.root?.message && (
          <p role="alert" className="text-[11.5px] font-semibold text-error">
            {errors.root.message}
          </p>
        )}

        <Button type="submit" loading={isSubmitting || registerMutation.isPending} className="mt-1 w-full">
          {role === "MENTOR" ? "Create mentor account" : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
