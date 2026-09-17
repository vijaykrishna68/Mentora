import { Navigate } from "react-router-dom";
import { RouteLoader } from "@/components/layout/RouteLoader";
import { useSession } from "@/features/auth/useSession";
import { paths, roleHomePath } from "./paths";

export function RootRedirect() {
  const session = useSession();

  if (session.status === "loading") {
    return <RouteLoader />;
  }

  if (session.status === "unauthenticated") {
    return <Navigate to={paths.login} replace />;
  }

  return <Navigate to={roleHomePath(session.user.role)} replace />;
}
