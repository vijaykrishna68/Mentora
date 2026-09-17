import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { paths } from "@/app/router/paths";

interface AuthLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4 py-12">
      <div className="w-full max-w-sm">
        <Link to={paths.discover} className="mb-8 block text-center font-serif text-xl font-semibold text-charcoal">
          Mentora
        </Link>
        <div className="rounded-lg border-[length:var(--b-hair)] border-line bg-ivory-raised p-7 shadow-md">
          <h1 className="font-serif text-2xl font-semibold text-charcoal">{title}</h1>
          <p className="mt-1 text-sm text-charcoal-muted">{description}</p>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-5 text-center text-sm text-charcoal-muted">{footer}</p>
      </div>
    </div>
  );
}
