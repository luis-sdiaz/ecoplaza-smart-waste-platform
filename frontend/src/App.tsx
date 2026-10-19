import { lazy, Suspense } from "react";
import { Outlet, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ProtectedRoute from "./auth/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import LoginPage from "./pages/LoginPage";

const AssistantPage = lazy(() => import("./pages/AssistantPage"));
const BuyersPage = lazy(() => import("./pages/BuyersPage"));
const ContainersPage = lazy(() => import("./pages/ContainersPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const SalesPage = lazy(() => import("./pages/SalesPage"));
const SensorsPage = lazy(() => import("./pages/SensorsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const WastePage = lazy(() => import("./pages/WastePage"));

function RouteLoading() {
  const { t } = useTranslation();

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-full items-center justify-center gap-3 p-8 text-sm text-ecoplaza-text-muted"
    >
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-ecoplaza-border border-t-ecoplaza-primary"
      />
      {t("common.loadingPage")}
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route
          element={
            <AppLayout>
              <Suspense fallback={<RouteLoading />}>
                <Outlet />
              </Suspense>
            </AppLayout>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/sensors" element={<SensorsPage />} />
          <Route path="/containers" element={<ContainersPage />} />
          <Route path="/waste" element={<WastePage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/buyers" element={<BuyersPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
