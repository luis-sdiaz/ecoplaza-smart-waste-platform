import {
  House,
  Leaf,
  SlidersHorizontal,
  Recycle,
  PackageOpen,
  Users,
  ShoppingCart,
  ChartNoAxesCombined,
  Bot,
  Settings,
  LogOut,
  UserRound,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";

const navItems = [
  { to: "/", end: true, icon: House, labelKey: "navigation.home" },
  { to: "/sensors", end: false, icon: SlidersHorizontal, labelKey: "navigation.sensors" },
  { to: "/waste", end: false, icon: Recycle, labelKey: "navigation.waste" },
  { to: "/inventory", end: false, icon: PackageOpen, labelKey: "navigation.inventory" },
  { to: "/buyers", end: false, icon: Users, labelKey: "navigation.buyers" },
  { to: "/sales", end: false, icon: ShoppingCart, labelKey: "navigation.sales" },
  { to: "/reports", end: false, icon: ChartNoAxesCombined, labelKey: "navigation.reports" },
  { to: "/assistant", end: false, icon: Bot, labelKey: "navigation.assistant" },
  { to: "/settings", end: false, icon: Settings, labelKey: "navigation.settings" },
];

function Sidebar() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const isSigningOutRef = useRef(false);

  const handleSignOut = async () => {
    if (isSigningOutRef.current) return;

    isSigningOutRef.current = true;
    setIsSigningOut(true);
    setSignOutError(null);

    try {
      const result = await signOut();

      if (!result.ok) {
        setSignOutError(
          result.error.code === "network_error"
            ? "auth.signOutNetworkError"
            : result.error.code === "rate_limited"
              ? "auth.signOutRateLimited"
              : "auth.signOutError",
        );
        return;
      }

      navigate("/login", { replace: true, state: null });
    } catch {
      setSignOutError("auth.signOutError");
    } finally {
      isSigningOutRef.current = false;
      setIsSigningOut(false);
    }
  };

  return (
    <aside
      className={`ecoplaza-sidebar h-screen ${
        isCollapsed ? "w-20" : "w-64"
      } flex flex-col justify-between select-none relative z-20 overflow-x-hidden rounded-none bg-gradient-to-b from-[#064e3b] via-[#065f46] to-[#043927] text-white dark:from-[#042f24] dark:via-[#03221a] dark:to-[#021812] transition-[width] duration-300 ease-in-out`}
    >
      {/* Encabezado con marca y botón de toggle colapsable */}
      <div
        className={`pt-5 pb-3 flex items-center transition-all duration-300 ${
          isCollapsed
            ? "flex-col gap-2 px-3 justify-center"
            : "justify-between gap-2 px-4"
        }`}
      >
        <div
          className={`flex items-center gap-3 min-w-0 ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <div className="ecoplaza-sidebar-logo flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 border border-white/20 p-2.5 text-emerald-200 shadow-sm">
            <Leaf size={20} strokeWidth={2.4} />
          </div>

          <div
            className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
              isCollapsed
                ? "max-w-0 opacity-0 pointer-events-none"
                : "max-w-xs opacity-100"
            }`}
          >
            <span className="ecoplaza-sidebar-title block truncate text-lg font-bold leading-tight tracking-tight text-white">
              EcoPlaza
            </span>
            <span className="ecoplaza-sidebar-secondary block truncate text-xs font-medium text-emerald-200/75">
              {t("navigation.tagline")}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={
            isCollapsed
              ? t("navigation.expandSidebar", "Expandir barra lateral")
              : t("navigation.collapseSidebar", "Colapsar barra lateral")
          }
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-emerald-100 transition-colors"
          title={
            isCollapsed
              ? t("navigation.expandSidebar", "Expandir")
              : t("navigation.collapseSidebar", "Colapsar")
          }
        >
          {isCollapsed ? (
            <ChevronRight size={18} strokeWidth={2.4} aria-hidden="true" />
          ) : (
            <ChevronLeft size={18} strokeWidth={2.4} aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Lista de navegación con pestaña activa conectada y curvas cóncavas */}
      <nav className="flex-1 flex flex-col justify-center gap-1 py-2 overflow-y-auto no-scrollbar">
        {navItems.map(({ to, end, icon: Icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={isCollapsed ? t(labelKey) : undefined}
            className={({ isActive }) =>
              `ecoplaza-sidebar-link group flex items-center transition-all duration-200 ${
                isActive
                  ? `ecoplaza-sidebar-link-active mr-0 rounded-l-full relative z-10 font-bold bg-[#eef7f2] text-[#064e3b] dark:bg-[#0b140e] dark:text-emerald-400 text-sm shadow-sm ${
                      isCollapsed
                        ? "ml-2 px-0 py-2.5 justify-center"
                        : "ml-3 pl-4 pr-5 py-2.5"
                    }`
                  : `ecoplaza-sidebar-link-inactive rounded-full text-emerald-100/80 hover:text-white hover:bg-white/10 text-sm font-medium ${
                      isCollapsed
                        ? "mx-2 px-0 py-2 justify-center"
                        : "mx-3 px-4 py-2"
                    }`
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <>
                    <span aria-hidden="true" className="sidebar-curve-top" />
                    <span aria-hidden="true" className="sidebar-curve-bottom" />
                  </>
                )}
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 2.2}
                  className={`shrink-0 transition-colors duration-200 ${
                    isActive
                      ? "text-[#064e3b] dark:text-emerald-400"
                      : "text-emerald-200/70 group-hover:text-white"
                  }`}
                  aria-hidden="true"
                />
                <span
                  className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                    isCollapsed
                      ? "max-w-0 opacity-0 ml-0 pointer-events-none"
                      : "max-w-xs opacity-100 ml-3 truncate"
                  }`}
                >
                  {t(labelKey)}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Tarjeta inferior de Perfil y Cerrar sesión */}
      <div
        className={`ecoplaza-sidebar-user-section mb-3 rounded-2xl bg-black/20 border border-white/10 backdrop-blur-md transition-all duration-300 ${
          isCollapsed ? "mx-2 p-2 flex flex-col items-center gap-2" : "mx-3 p-3"
        }`}
      >
        {user && (
          <NavLink
            to="/profile"
            aria-label={t("navigation.profile")}
            title={isCollapsed ? user.name : undefined}
            className={({ isActive }) =>
              `ecoplaza-sidebar-profile group flex min-w-0 items-center rounded-xl p-1.5 transition-all duration-150 ${
                isCollapsed ? "justify-center w-full" : "gap-3"
              } ${
                isActive
                  ? "ecoplaza-sidebar-profile-active bg-white/15"
                  : "hover:bg-white/10"
              }`
            }
          >
            <div className="ecoplaza-sidebar-avatar flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-emerald-500/20 text-emerald-100 ring-2 ring-emerald-300/40 shadow-xs">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound size={18} strokeWidth={2} aria-hidden="true" />
              )}
            </div>
            <div
              className={`min-w-0 flex-1 text-left overflow-hidden transition-all duration-300 ${
                isCollapsed
                  ? "max-w-0 opacity-0 pointer-events-none hidden"
                  : "max-w-xs opacity-100"
              }`}
            >
              <p
                className="ecoplaza-sidebar-user-name truncate text-xs font-semibold text-white"
                title={user.name}
              >
                {user.name}
              </p>
              <p
                className="ecoplaza-sidebar-secondary truncate text-[11px] text-emerald-200/70"
                title={user.email}
              >
                {user.email}
              </p>
            </div>
          </NavLink>
        )}

        <div
          className={`flex items-center justify-between ${
            user ? "border-t border-white/10 pt-2 mt-2" : ""
          } ${isCollapsed ? "w-full justify-center" : ""}`}
        >
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            aria-busy={isSigningOut}
            title={
              isCollapsed
                ? isSigningOut
                  ? t("auth.signingOut")
                  : t("navigation.signOut")
                : undefined
            }
            className={`ecoplaza-sidebar-sign-out flex cursor-pointer items-center rounded-xl text-xs font-medium text-emerald-100/85 hover:bg-rose-500/20 hover:text-rose-200 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              isCollapsed
                ? "w-full justify-center p-2"
                : "w-full justify-between px-3 py-1.5"
            }`}
          >
            <span className={isCollapsed ? "sr-only" : "truncate"}>
              {isSigningOut ? t("auth.signingOut") : t("navigation.signOut")}
            </span>
            <LogOut
              size={16}
              strokeWidth={2.2}
              aria-hidden="true"
              className="shrink-0 text-emerald-200/70 group-hover:text-rose-200 transition-colors"
            />
          </button>
        </div>
        {signOutError && (
          <p
            role="alert"
            className={`text-xs leading-4 text-rose-300 ${
              isCollapsed ? "sr-only" : "mt-1"
            }`}
          >
            {t(signOutError)}
          </p>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
