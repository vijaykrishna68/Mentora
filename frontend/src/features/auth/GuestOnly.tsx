import { Navigate, Outlet } from "react-router-dom";
import { RouteLoader } from "@/components/layout/RouteLoader";
import { roleHomePath } from "@/app/router/paths";
import { useSession } from "./useSession";

/** Keeps already-authenticated users off /login and /signup, sending them to their role's home. */
export function GuestOnly() {
  const session = useSession();

  if (session.status === "loading") {
    return <RouteLoader />;
  }

  if (session.status === "authenticated") {
    return <Navigate to={roleHomePath(session.user.role)} replace />;
  }

  return <Outlet />;
}
