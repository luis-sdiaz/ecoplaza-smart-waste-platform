import { useEffect, useState, type ReactNode } from "react";
import { Info, Menu, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import Sidebar from "../components/Sidebar";
import DesktopDiagnosticsModal from "../components/DesktopDiagnosticsModal";
import { useTheme } from "../theme/useTheme";

interface AppLayoutProps {
  children?: ReactNode;
}

function AppLayout({ children }: AppLayoutProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  return (
    <div
      data-theme={theme}
      className="ecoplaza-app-layout relative flex h-screen overflow-hidden bg-slate-50 text-slate-900 transition-colors duration-150 dark:bg-[#0b130e] dark:text-slate-100"
    >
      {/* Malla sutil de gradientes ambientales esmeralda y cian de baja intensidad (mesh gradient) que baña toda la ventana */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="absolute -top-[10%] -left-[5%] h-[550px] w-[650px] rounded-full bg-[radial-gradient(ellipse_80%_80%_at_30%_30%,rgba(16,185,129,0.18),rgba(255,255,255,0))] blur-3xl dark:bg-[radial-gradient(ellipse_80%_80%_at_30%_30%,rgba(16,185,129,0.22),rgba(11,19,14,0))]" />
        <div className="absolute -top-[15%] right-[10%] h-[550px] w-[800px] rounded-full bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.12),rgba(255,255,255,0))] blur-3xl dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(11,19,14,0))]" />
        <div className="absolute top-[35%] -right-[5%] h-[450px] w-[550px] rounded-full bg-[radial-gradient(ellipse_60%_60%_at_80%_50%,rgba(6,182,212,0.08),rgba(255,255,255,0))] blur-3xl dark:bg-[radial-gradient(ellipse_60%_60%_at_80%_50%,rgba(6,182,212,0.10),rgba(11,19,14,0))]" />
        <div className="absolute -bottom-[10%] -left-[5%] h-[500px] w-[600px] rounded-full bg-[radial-gradient(ellipse_60%_60%_at_20%_80%,rgba(16,185,129,0.16),rgba(255,255,255,0))] blur-3xl dark:bg-[radial-gradient(ellipse_60%_60%_at_20%_80%,rgba(16,185,129,0.20),rgba(11,19,14,0))]" />
      </div>

      {/* Sidebar de altura completa anclado a la izquierda (full-bleed) en pantallas medianas y grandes */}
      <div className="hidden md:block shrink-0 relative z-20">
        <Sidebar />
      </div>

      <div className="ecoplaza-app-content-wrapper relative z-10 flex min-h-0 min-w-0 flex-1 flex-col bg-slate-50 text-slate-900 transition-colors duration-150 dark:bg-[#0b130e] dark:text-slate-100">
        {/* Botón de menú hamburguesa móvil */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-expanded={isMobileMenuOpen}
          aria-label={t("navigation.openMobileMenu", "Abrir menú de navegación")}
          className="md:hidden absolute top-4 left-4 z-20 flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-white/80 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 shadow-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Menu size={18} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => setIsDiagnosticsOpen(true)}
          className="absolute top-4 right-6 z-20 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
          aria-label={t("desktopDiagnostics.openButtonAria")}
        >
          <Info size={16} aria-hidden="true" />
        </button>

        <main className="ecoplaza-app-main relative min-h-0 min-w-0 flex-1 overflow-y-auto bg-slate-50 text-slate-900 transition-colors duration-150 dark:bg-[#0b130e] dark:text-slate-100">
          <div className="relative z-10">{children}</div>
        </main>
      </div>

      {/* Drawer de navegación móvil */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop / Overlay oscuro */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Contenedor del Drawer accesible */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("navigation.mobileMenu", "Menú de navegación móvil")}
            className="relative z-10 flex h-full w-72 max-w-[85vw] flex-col bg-[#064e3b] dark:bg-[#021812] shadow-2xl transition-transform duration-300 ease-in-out"
          >
            {/* Botón para cerrar drawer */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label={t("navigation.closeMobileMenu", "Cerrar menú de navegación")}
              className="absolute top-4 right-4 z-30 flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-emerald-100 hover:bg-white/20 transition-colors"
            >
              <X size={18} aria-hidden="true" />
            </button>

            {/* Contenido del Sidebar */}
            <div className="h-full w-full overflow-hidden">
              <Sidebar onTabChange={() => setIsMobileMenuOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <DesktopDiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
      />
    </div>
  );
}

export default AppLayout;

