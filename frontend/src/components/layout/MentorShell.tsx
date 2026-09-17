import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils/cn";
import { paths } from "@/app/router/paths";
import { useSession } from "@/features/auth/useSession";
import { AccountMenu } from "./AccountMenu";
import { ToastViewport } from "@/components/ui";

const links = [
  { to: paths.mentorDashboard, label: "Dashboard", end: true },
  { to: paths.mentorAppointments, label: "Appointments" },
  { to: paths.mentorOfferings, label: "Offerings" },
  { to: paths.mentorAvailability, label: "Availability" },
  { to: paths.mentorProfileSettings, label: "Profile" },
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "rounded-sm px-2.5 py-2.5 text-[13.5px] font-semibold whitespace-nowrap transition-colors duration-[var(--dur-fast)]",
    isActive ? "bg-pine text-ivory" : "text-charcoal-muted hover:bg-ivory-sunken hover:text-charcoal",
  );
}

/** Sidebar workspace shell for the mentor experience (mockup's `.dash-shell`). */
export function MentorShell() {
  const session = useSession();

  return (
    <div className="grid min-h-screen bg-ivory tablet:grid-cols-[224px_1fr]">
      <aside className="flex flex-row items-center gap-2 overflow-x-auto border-b-[length:var(--b-hair)] border-line bg-ivory-raised p-4 tablet:min-h-screen tablet:flex-col tablet:items-stretch tablet:border-b-0 tablet:border-r-[length:var(--b-hair)] tablet:p-5">
        <NavLink to={paths.mentorDashboard} className="mr-4 font-serif text-lg font-semibold text-charcoal tablet:mr-0 tablet:mb-6">
          Mentora
        </NavLink>
        <nav className="flex flex-row gap-1 tablet:flex-col" aria-label="Mentor dashboard">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-col">
        <header className="flex items-center justify-end border-b-[length:var(--b-hair)] border-line bg-ivory-raised px-5 py-3 tablet:hidden">
          {session.status === "authenticated" && <AccountMenu user={session.user} />}
        </header>
        <div className="hidden justify-end px-8 pt-6 tablet:flex">
          {session.status === "authenticated" && <AccountMenu user={session.user} />}
        </div>
        <main className="flex-1 px-5 py-6 tablet:px-8 tablet:py-7">
          <Outlet />
        </main>
      </div>
      <ToastViewport />
    </div>
  );
}
