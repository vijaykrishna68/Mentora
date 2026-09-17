import { createBrowserRouter } from "react-router-dom";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { MentorShell } from "@/components/layout/MentorShell";
import { NotFoundPage } from "@/components/layout/NotFoundPage";
import { GuestOnly } from "@/features/auth/GuestOnly";
import { LoginPage } from "@/features/auth/LoginPage";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { RequireRole } from "@/features/auth/RequireRole";
import { SignupPage } from "@/features/auth/SignupPage";
import { AppointmentsPage } from "@/features/appointments/AppointmentsPage";
import { MentorAvailabilityPage } from "@/features/availability/MentorAvailabilityPage";
import { DiscoverPage } from "@/features/discover/DiscoverPage";
import { MentorAppointmentsPage } from "@/features/mentor-dashboard/MentorAppointmentsPage";
import { MentorDashboardPage } from "@/features/mentor-dashboard/MentorDashboardPage";
import { MentorProfilePage } from "@/features/mentor-profile/MentorProfilePage";
import { MentorProfileSettingsPage } from "@/features/mentor-profile-management/MentorProfileSettingsPage";
import { MentorSetupPage } from "@/features/mentor-profile-management/MentorSetupPage";
import { MentorOfferingsPage } from "@/features/offerings/MentorOfferingsPage";
import { paths } from "./paths";
import { RootRedirect } from "./RootRedirect";

export const router = createBrowserRouter([
  { path: "/", element: <RootRedirect /> },

  {
    element: <GuestOnly />,
    children: [
      { path: paths.login, element: <LoginPage /> },
      { path: paths.signup, element: <SignupPage /> },
    ],
  },

  {
    element: <RequireAuth />,
    children: [
      // A brand-new mentor needs onboarding before the dashboard shell's
      // nav (offerings/availability/appointments) makes sense, so setup is
      // reachable by any authenticated mentor without the full shell.
      { path: paths.mentorSetup, element: <MentorSetupPage /> },

      {
        element: <RequireRole role="CUSTOMER" />,
        children: [
          {
            element: <CustomerShell />,
            children: [
              { path: paths.discover, element: <DiscoverPage /> },
              { path: "/mentors/:mentorId", element: <MentorProfilePage /> },
              { path: paths.appointments, element: <AppointmentsPage /> },
            ],
          },
        ],
      },

      {
        element: <RequireRole role="MENTOR" />,
        children: [
          {
            element: <MentorShell />,
            children: [
              { path: paths.mentorDashboard, element: <MentorDashboardPage /> },
              { path: paths.mentorOfferings, element: <MentorOfferingsPage /> },
              { path: paths.mentorAvailability, element: <MentorAvailabilityPage /> },
              { path: paths.mentorAppointments, element: <MentorAppointmentsPage /> },
              { path: paths.mentorProfileSettings, element: <MentorProfileSettingsPage /> },
            ],
          },
        ],
      },
    ],
  },

  { path: "*", element: <NotFoundPage /> },
]);
