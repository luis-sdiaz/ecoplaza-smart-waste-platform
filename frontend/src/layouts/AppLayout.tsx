import type { ReactNode } from "react";
import Sidebar from "../components/Sidebar";
import WindowControls from "../components/WindowControls";
import { isTauriEnvironment } from "../services/tauriService";

interface AppLayoutProps {
  children: ReactNode;
}

function AppLayout({ children }: AppLayoutProps) {
  const isDesktop = isTauriEnvironment();

  return (
    <div className="ecoplaza-app-layout flex h-screen overflow-hidden bg-ecoplaza-background">
      <Sidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header
          className={
            isDesktop
              ? "flex h-9 shrink-0 items-center justify-end border-b border-ecoplaza-border bg-ecoplaza-surface px-4 select-none"
              : "hidden"
          }
        >
          <div className="flex items-center gap-2">
            <WindowControls />
          </div>
        </header>

        <main className="ecoplaza-app-main min-h-0 min-w-0 flex-1 overflow-y-auto bg-ecoplaza-background">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
