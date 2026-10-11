import type { ReactNode } from "react";
import Sidebar from "../components/Sidebar";

interface AppLayoutProps {
  children: ReactNode;
}

function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="ecoplaza-app-layout flex h-screen overflow-hidden bg-ecoplaza-background">
      <Sidebar />

      <main className="ecoplaza-app-main min-h-0 min-w-0 flex-1 overflow-y-auto bg-ecoplaza-background">
        {children}
      </main>
    </div>
  );
}

export default AppLayout;
