import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils/cn";
import { paths } from "@/app/router/paths";
import { useSession } from "@/features/auth/useSession";
import { AccountMenu } from "./AccountMenu";
import { ToastViewport } from "@/components/ui";

const links = [
  { to: paths.discover, label: "Discover" },
  { to: paths.appointments, label: "My Appointments" },
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "border-b-[length:var(--b-def)] border-transparent pb-5 -mb-5 text-[13.5px] font-semibold text-charcoal-muted transition-colors duration-[var(--dur-fast)]",
    isActive ? "border-pine text-charcoal" : "hover:text-charcoal",
  );
}

/** Top-nav application shell for the customer experience (mockup's `.app-nav`). */
export function CustomerShell() {
  const session = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      <header className="flex h-16 items-center justify-between border-b-[length:var(--b-hair)] border-line bg-ivory-raised px-4 sm:px-8">
        <div className="flex items-center gap-8">
          <NavLink to={paths.discover} className="font-serif text-lg font-semibold text-charcoal">
            Mentora
          </NavLink>
          <nav className="hidden items-center gap-6 tablet:flex" aria-label="Primary">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} className={navLinkClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {session.status === "authenticated" && (
            <span className="hidden sm:block">
              <AccountMenu user={session.user} />
            </span>
          )}
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-sm p-2 text-charcoal tablet:hidden"
          >
            <span className="sr-only">Toggle menu</span>
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5">
              <path
                d="M3 5h14M3 10h14M3 15h14"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </header>

      {menuOpen && (
        <nav
          id="mobile-nav"
          aria-label="Primary"
          className="flex flex-col gap-1 border-b-[length:var(--b-hair)] border-line bg-ivory-raised px-4 py-3 tablet:hidden"
        >
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className="rounded-sm px-2 py-2 text-sm font-semibold text-charcoal-muted aria-[current=page]:bg-ivory-sunken aria-[current=page]:text-charcoal"
            >
              {link.label}
            </NavLink>
          ))}
          {session.status === "authenticated" && (
            <div className="mt-2 border-t-[length:var(--b-hair)] border-line px-2 pt-3 sm:hidden">
              <AccountMenu user={session.user} />
            </div>
          )}
        </nav>
      )}

      <main className="flex-1">
        <Outlet />
      </main>
      <ToastViewport />
    </div>
  );
}
