import { Navigate, Outlet } from "react-router-dom";
import { RouteLoader } from "@/components/layout/RouteLoader";
import { paths, roleHomePath } from "@/app/router/paths";
import type { Role } from "@/types";
import { useSession } from "./useSession";

/** Blocks access outside the given role, redirecting to that role's own home instead of a dead end. */
export function RequireRole({ role }: { role: Role }) {
  const session = useSession();

  if (session.status === "loading") {
    return <RouteLoader />;
  }

  if (session.status === "unauthenticated") {
    return <Navigate to={paths.login} replace />;
  }

  if (session.user.role !== role) {
    return <Navigate to={roleHomePath(session.user.role)} replace />;
  }

  return <Outlet />;
}
