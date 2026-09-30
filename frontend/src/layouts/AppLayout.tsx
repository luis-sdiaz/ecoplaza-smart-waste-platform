import type { ReactNode } from "react";
import Sidebar from "../components/Sidebar";

interface AppLayoutProps {
  children: ReactNode;
}

function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-ecoplaza-background">
      <Sidebar />

      <main className="flex-1">{children}</main>
    </div>
  );
}

export default AppLayout;
