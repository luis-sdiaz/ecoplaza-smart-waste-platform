import { Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import SensorsPage from "./pages/SensorsPage";
import WastePage from "./pages/WastePage";

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/sensors" element={<SensorsPage />} />
        <Route path="/waste" element={<WastePage />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
