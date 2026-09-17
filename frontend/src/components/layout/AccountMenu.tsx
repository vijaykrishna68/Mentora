import { useNavigate } from "react-router-dom";
import { Avatar } from "@/components/ui";
import { useLogout } from "@/features/auth/useAuthMutations";
import { useToastStore } from "@/lib/stores/toastStore";
import { paths } from "@/app/router/paths";
import type { User } from "@/types";

export function AccountMenu({ user }: { user: User }) {
  const logout = useLogout();
  const navigate = useNavigate();
  const push = useToastStore((state) => state.push);

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => {
        navigate(paths.login);
      },
      onError: () => {
        push({ variant: "error", title: "Couldn't sign out", description: "Please try again." });
      },
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar name={user.name} size="sm" />
      <span className="hidden text-[13.5px] font-semibold text-charcoal sm:inline">{user.name}</span>
      <button
        type="button"
        onClick={handleLogout}
        disabled={logout.isPending}
        className="text-xs font-semibold text-charcoal-muted underline decoration-line underline-offset-2 hover:decoration-charcoal disabled:opacity-50"
      >
        {logout.isPending ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
