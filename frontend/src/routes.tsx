import { createBrowserRouter } from "react-router";
import { Login } from "./pages/auth/Login";
import { Layout } from "./components/layout/Layout";
import { DashboardStudent } from "./pages/dashboard/DashboardStudent";
import { DashboardAdmin } from "./pages/dashboard/DashboardAdmin";
import { CalendarView } from "./pages/booking/CalendarView";
import { DeviceManagement } from "./pages/equipment/DeviceManagement";
import { ForgotPassword } from "./pages/auth/ForgotPassword";
import { MyBookings } from "./pages/booking/MyBookings";
import { Approvals } from "./pages/booking/Approvals";
import { Users } from "./pages/dashboard/Users";
import { ResourceManagement } from "./pages/chemicals/ResourceManagement";
import { Reports } from "./pages/reports/Reports";
import { Courses } from "./pages/courses/Courses";
import { Settings } from "./pages/settings/Settings";
import { ErrorBoundary } from "./components/common/ErrorBoundary";

import { ProtectedRoute } from "./components/auth/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Login,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/login",
    Component: Login,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/forgot-password",
    Component: ForgotPassword,
    errorElement: <ErrorBoundary />,
  },
  {
    // General protected routes
    path: "/",
    Component: ProtectedRoute,
    errorElement: <ErrorBoundary />,
    children: [
      {
        path: "/",
        Component: Layout,
        children: [
          { path: "student-dashboard", Component: DashboardStudent },
          { path: "admin-dashboard", Component: DashboardAdmin },
          { path: "calendar", Component: CalendarView },
          { path: "my-bookings", Component: MyBookings },
          { path: "approvals", Component: Approvals },
          { path: "users", Component: Users },
          { path: "devices", Component: DeviceManagement },
          { path: "resources", Component: ResourceManagement },
          { path: "courses", Component: Courses },
          { path: "reports", Component: Reports },
          { path: "settings", Component: Settings },
        ],
      },
    ],
  },
]);
