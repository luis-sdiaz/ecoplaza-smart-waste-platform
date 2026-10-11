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
} from "lucide-react";
import { startTransition } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";

function Sidebar() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    navigate("/login", { replace: true, state: null });
    startTransition(signOut);
  };

  return (
    <aside className="ecoplaza-sidebar flex h-screen w-64 shrink-0 flex-col border-r border-ecoplaza-border bg-ecoplaza-surface p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="ecoplaza-sidebar-logo flex h-11 w-11 items-center justify-center rounded-xl bg-ecoplaza-primary text-white">
          <Leaf size={24} strokeWidth={2.2} />
        </div>

        <div>
          <span className="ecoplaza-sidebar-title block text-lg font-semibold text-ecoplaza-text">
            EcoPlaza
          </span>

          <span className="ecoplaza-sidebar-secondary block text-xs text-ecoplaza-text-muted">
            {t("navigation.tagline")}
          </span>
        </div>
      </div>

      <nav className="min-h-0 overflow-y-auto">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `ecoplaza-sidebar-link flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${
              isActive
                ? "ecoplaza-sidebar-link-active bg-ecoplaza-primary text-white"
                : "ecoplaza-sidebar-link-inactive text-ecoplaza-text-muted hover:bg-ecoplaza-background hover:text-ecoplaza-text"
            }`
          }
        >
          <House size={20} strokeWidth={2.2} />
          <span>{t("navigation.home")}</span>
        </NavLink>

        <NavLink
          to="/sensors"
          className={({ isActive }) =>
            `ecoplaza-sidebar-link mt-1.5 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${
              isActive
                ? "ecoplaza-sidebar-link-active bg-ecoplaza-primary text-white"
                : "ecoplaza-sidebar-link-inactive text-ecoplaza-text-muted hover:bg-ecoplaza-background hover:text-ecoplaza-text"
            }`
          }
        >
          <SlidersHorizontal size={20} strokeWidth={2.2} />
          <span>{t("navigation.sensors")}</span>
        </NavLink>

        <NavLink
          to="/waste"
          className={({ isActive }) =>
            `ecoplaza-sidebar-link mt-1.5 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${
              isActive
                ? "ecoplaza-sidebar-link-active bg-ecoplaza-primary text-white"
                : "ecoplaza-sidebar-link-inactive text-ecoplaza-text-muted hover:bg-ecoplaza-background hover:text-ecoplaza-text"
            }`
          }
        >
          <Recycle size={20} strokeWidth={2.2} />
          <span>{t("navigation.waste")}</span>
        </NavLink>

        <NavLink
          to="/inventory"
          className={({ isActive }) =>
            `ecoplaza-sidebar-link mt-1.5 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${
              isActive
                ? "ecoplaza-sidebar-link-active bg-ecoplaza-primary text-white"
                : "ecoplaza-sidebar-link-inactive text-ecoplaza-text-muted hover:bg-ecoplaza-background hover:text-ecoplaza-text"
            }`
          }
        >
          <PackageOpen size={20} strokeWidth={2.2} />
          <span>{t("navigation.inventory")}</span>
        </NavLink>

        <NavLink
          to="/buyers"
          className={({ isActive }) =>
            `ecoplaza-sidebar-link mt-1.5 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${
              isActive
                ? "ecoplaza-sidebar-link-active bg-ecoplaza-primary text-white"
                : "ecoplaza-sidebar-link-inactive text-ecoplaza-text-muted hover:bg-ecoplaza-background hover:text-ecoplaza-text"
            }`
          }
        >
          <Users size={20} strokeWidth={2.2} />
          <span>{t("navigation.buyers")}</span>
        </NavLink>

        <NavLink
          to="/sales"
          className={({ isActive }) =>
            `ecoplaza-sidebar-link mt-1.5 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${
              isActive
                ? "ecoplaza-sidebar-link-active bg-ecoplaza-primary text-white"
                : "ecoplaza-sidebar-link-inactive text-ecoplaza-text-muted hover:bg-ecoplaza-background hover:text-ecoplaza-text"
            }`
          }
        >
          <ShoppingCart size={20} strokeWidth={2.2} />
          <span>{t("navigation.sales")}</span>
        </NavLink>

        <NavLink
          to="/reports"
          className={({ isActive }) =>
            `ecoplaza-sidebar-link mt-1.5 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${
              isActive
                ? "ecoplaza-sidebar-link-active bg-ecoplaza-primary text-white"
                : "ecoplaza-sidebar-link-inactive text-ecoplaza-text-muted hover:bg-ecoplaza-background hover:text-ecoplaza-text"
            }`
          }
        >
          <ChartNoAxesCombined size={20} strokeWidth={2.2} />
          <span>{t("navigation.reports")}</span>
        </NavLink>
        <NavLink
          to="/assistant"
          className={({ isActive }) =>
            `ecoplaza-sidebar-link mt-1.5 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${
              isActive
                ? "ecoplaza-sidebar-link-active bg-ecoplaza-primary text-white"
                : "ecoplaza-sidebar-link-inactive text-ecoplaza-text-muted hover:bg-ecoplaza-background hover:text-ecoplaza-text"
            }`
          }
        >
          <Bot size={20} strokeWidth={2.2} />
          <span>{t("navigation.assistant")}</span>
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `ecoplaza-sidebar-link mt-1.5 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${
              isActive
                ? "ecoplaza-sidebar-link-active bg-ecoplaza-primary text-white"
                : "ecoplaza-sidebar-link-inactive text-ecoplaza-text-muted hover:bg-ecoplaza-background hover:text-ecoplaza-text"
            }`
          }
        >
          <Settings size={20} strokeWidth={2.2} />
          <span>{t("navigation.settings")}</span>
        </NavLink>
      </nav>

      {user && (
        <div className="ecoplaza-sidebar-user-section mt-6 min-w-0 border-t border-ecoplaza-border pt-3">
          <NavLink
            to="/profile"
            aria-label={t("navigation.profile")}
            className={({ isActive }) =>
              `ecoplaza-sidebar-profile flex min-w-0 items-center gap-3 rounded-xl p-2 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary motion-reduce:transition-none ${
                isActive
                  ? "ecoplaza-sidebar-profile-active bg-ecoplaza-background"
                  : "hover:bg-ecoplaza-background"
              }`
            }
          >
            <div className="ecoplaza-sidebar-avatar flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ecoplaza-primary/10 text-ecoplaza-primary-dark">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound size={21} strokeWidth={1.9} aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p
                className="ecoplaza-sidebar-user-name truncate text-sm font-semibold text-ecoplaza-text"
                title={user.name}
              >
                {user.name}
              </p>
              <p
                className="ecoplaza-sidebar-secondary mt-1 truncate text-xs text-ecoplaza-text-muted"
                title={user.email}
              >
                {user.email}
              </p>
            </div>
          </NavLink>
        </div>
      )}

      <button
        type="button"
        onClick={handleSignOut}
        className="ecoplaza-sidebar-sign-out mt-3 flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium text-ecoplaza-text-muted transition-colors duration-150 hover:bg-ecoplaza-background hover:text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary motion-reduce:transition-none"
      >
        <LogOut size={20} strokeWidth={2.2} aria-hidden="true" />
        <span>{t("navigation.signOut")}</span>
      </button>
    </aside>
  );
}

export default Sidebar;
