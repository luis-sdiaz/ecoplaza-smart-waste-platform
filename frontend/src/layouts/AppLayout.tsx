import { useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import Sidebar from "../components/Sidebar";
import DesktopDiagnosticsModal from "../components/DesktopDiagnosticsModal";
import { useTheme } from "../theme/useTheme";

interface AppLayoutProps {
  children: ReactNode;
}

function AppLayout({ children }: AppLayoutProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  return (
    <div
      data-theme={theme}
      className="ecoplaza-app-layout flex h-screen overflow-hidden bg-slate-50 text-slate-900 transition-colors duration-150 dark:bg-[#0b130e] dark:text-slate-100"
    >
      <Sidebar />

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-slate-50 text-slate-900 transition-colors duration-150 dark:bg-[#0b130e] dark:text-slate-100">
        <button
          type="button"
          onClick={() => setIsDiagnosticsOpen(true)}
          className="absolute top-4 right-6 z-20 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
          aria-label={t("desktopDiagnostics.openButtonAria")}
        >
          <Info size={16} aria-hidden="true" />
        </button>

        <main className="ecoplaza-app-main min-h-0 min-w-0 flex-1 overflow-y-auto bg-slate-50 text-slate-900 transition-colors duration-150 dark:bg-[#0b130e] dark:text-slate-100">
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
