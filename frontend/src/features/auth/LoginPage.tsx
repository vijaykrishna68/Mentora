import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Field, Input } from "@/components/ui";
import { isApiError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/api/queryKeys";
import { paths, roleHomePath } from "@/app/router/paths";
import type { User } from "@/types";
import { AuthLayout } from "./AuthLayout";
import { useLogin } from "./useAuthMutations";
import { loginSchema, type LoginInput } from "./schemas";

export function LoginPage() {
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  function onSubmit(values: LoginInput) {
    login.mutate(values, {
      onSuccess: async ({ user }) => {
        // Await the (transition-based) navigation before writing the
        // session cache — see the comment in useAuthMutations.ts. Otherwise
        // GuestOnly can still be mounted when the cache updates and its own
        // redirect (to the generic role home) can win the race over
        // returning the user to `from`.
        const from = (location.state as { from?: { pathname: string } } | undefined)?.from?.pathname;
        await navigate(from ?? roleHomePath(user.role), { replace: true });
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
      title="Welcome back"
      description="Sign in to continue to Mentora."
      footer={
        <>
          New here?{" "}
          <Link to={paths.signup} className="font-semibold text-pine underline underline-offset-2">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Field label="Email" error={errors.email?.message} required>
          {(fieldProps) => <Input type="email" autoComplete="email" {...fieldProps} {...register("email")} />}
        </Field>
        <Field label="Password" error={errors.password?.message} required>
          {(fieldProps) => (
            <Input type="password" autoComplete="current-password" {...fieldProps} {...register("password")} />
          )}
        </Field>

        {errors.root?.message && (
          <p role="alert" className="text-[11.5px] font-semibold text-error">
            {errors.root.message}
          </p>
        )}

        <Button type="submit" loading={isSubmitting || login.isPending} className="mt-1 w-full">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
