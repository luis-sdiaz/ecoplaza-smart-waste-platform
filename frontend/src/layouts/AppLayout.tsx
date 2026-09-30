import type { ReactNode } from "react";
import Sidebar from "../components/Sidebar";

interface AppLayoutProps {
  children: ReactNode;
}

function AppLayout({ children }: AppLayoutProps) {
  return (
    <div>
      <Sidebar />

      <main>{children}</main>
    </div>
  );
}

export default AppLayout;
