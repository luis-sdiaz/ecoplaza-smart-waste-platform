import { Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import BuyersPage from "./pages/BuyersPage";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import SensorsPage from "./pages/SensorsPage";
import WastePage from "./pages/WastePage";

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/sensors" element={<SensorsPage />} />
        <Route path="/waste" element={<WastePage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/buyers" element={<BuyersPage />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
