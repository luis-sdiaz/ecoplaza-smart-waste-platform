import { Outlet, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import BuyersPage from "./pages/BuyersPage";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import SalesPage from "./pages/SalesPage";
import SensorsPage from "./pages/SensorsPage";
import WastePage from "./pages/WastePage";
import ReportsPage from "./pages/ReportsPage";
import AssistantPage from "./pages/AssistantPage";
import SettingsPage from "./pages/SettingsPage";
import NotFoundPage from "./pages/NotFoundPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route
          element={
            <AppLayout>
              <Outlet />
            </AppLayout>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/sensors" element={<SensorsPage />} />
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
