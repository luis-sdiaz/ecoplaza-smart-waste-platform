import { Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import BuyersPage from "./pages/BuyersPage";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import SalesPage from "./pages/SalesPage";
import SensorsPage from "./pages/SensorsPage";
import WastePage from "./pages/WastePage";
import ReportsPage from "./pages/ReportsPage";

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/sensors" element={<SensorsPage />} />
        <Route path="/waste" element={<WastePage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/buyers" element={<BuyersPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
