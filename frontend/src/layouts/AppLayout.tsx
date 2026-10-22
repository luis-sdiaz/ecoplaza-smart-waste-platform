import { useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import Sidebar from "../components/Sidebar";
import WindowControls from "../components/WindowControls";
import DesktopDiagnosticsModal from "../components/DesktopDiagnosticsModal";

interface AppLayoutProps {
  children: ReactNode;
}

function AppLayout({ children }: AppLayoutProps) {
  const { t } = useTranslation();
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  return (
    <div className="ecoplaza-app-layout flex h-screen overflow-hidden bg-ecoplaza-background">
      <Sidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-9 shrink-0 items-center justify-end gap-2 border-b border-ecoplaza-border bg-ecoplaza-surface px-4 select-none">
          <button
            type="button"
            onClick={() => setIsDiagnosticsOpen(true)}
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-border/30 hover:text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary"
            aria-label={t("desktopDiagnostics.openButtonAria")}
          >
            <Info size={14} aria-hidden="true" />
          </button>
          <WindowControls />
        </header>

        <main className="ecoplaza-app-main min-h-0 min-w-0 flex-1 overflow-y-auto bg-ecoplaza-background">
          {children}
        </main>
      </div>

      <DesktopDiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
      />
    </div>
  );
}

export default AppLayout;
