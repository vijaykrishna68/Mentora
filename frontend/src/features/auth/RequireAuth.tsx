import { Navigate, Outlet, useLocation } from "react-router-dom";
import { RouteLoader } from "@/components/layout/RouteLoader";
import { paths } from "@/app/router/paths";
import { useSession } from "./useSession";

/** Blocks unauthenticated access. Backend authorization remains authoritative — this only shapes the UI. */
export function RequireAuth() {
  const session = useSession();
  const location = useLocation();

  if (session.status === "loading") {
    return <RouteLoader />;
  }

  if (session.status === "unauthenticated") {
    return <Navigate to={paths.login} state={{ from: location }} replace />;
  }

  return <Outlet />;
}
