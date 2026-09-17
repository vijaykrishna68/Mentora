import { Link } from "react-router-dom";
import { paths } from "@/app/router/paths";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-ivory px-4 text-center">
      <p className="font-serif text-5xl font-semibold text-charcoal">404</p>
      <p className="text-sm text-charcoal-muted">This page doesn't exist.</p>
      <Link to={paths.discover} className="text-sm font-semibold text-pine underline underline-offset-2">
        Back to Discover
      </Link>
    </div>
  );
}
