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
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-ecoplaza-border bg-ecoplaza-surface p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ecoplaza-primary text-white">
          <Leaf size={24} strokeWidth={2.2} />
        </div>

        <div>
          <span className="block text-lg font-semibold text-ecoplaza-text">
            EcoPlaza
          </span>

          <span className="block text-xs text-ecoplaza-text-muted">
            {t("navigation.tagline")}
          </span>
        </div>
      </div>

      <nav className="min-h-0 overflow-y-auto">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${
              isActive
                ? "bg-ecoplaza-primary text-white"
                : "text-ecoplaza-text-muted hover:bg-ecoplaza-background hover:text-ecoplaza-text"
            }`
          }
        >
          <House size={20} strokeWidth={2.2} />
          <span>{t("navigation.home")}</span>
        </NavLink>

        <NavLink
          to="/sensors"
          className={({ isActive }) =>
            `mt-1.5 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${
              isActive
                ? "bg-ecoplaza-primary text-white"
                : "text-ecoplaza-text-muted hover:bg-ecoplaza-background hover:text-ecoplaza-text"
            }`
          }
        >
          <SlidersHorizontal size={20} strokeWidth={2.2} />
          <span>{t("navigation.sensors")}</span>
        </NavLink>

        <NavLink
          to="/waste"
          className={({ isActive }) =>
            `mt-1.5 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${
              isActive
                ? "bg-ecoplaza-primary text-white"
                : "text-ecoplaza-text-muted hover:bg-ecoplaza-background hover:text-ecoplaza-text"
            }`
          }
        >
          <Recycle size={20} strokeWidth={2.2} />
          <span>{t("navigation.waste")}</span>
        </NavLink>

        <NavLink
          to="/inventory"
          className={({ isActive }) =>
            `mt-1.5 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${
              isActive
                ? "bg-ecoplaza-primary text-white"
                : "text-ecoplaza-text-muted hover:bg-ecoplaza-background hover:text-ecoplaza-text"
            }`
          }
        >
          <PackageOpen size={20} strokeWidth={2.2} />
          <span>{t("navigation.inventory")}</span>
        </NavLink>

        <NavLink
          to="/buyers"
          className={({ isActive }) =>
            `mt-1.5 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${
              isActive
                ? "bg-ecoplaza-primary text-white"
                : "text-ecoplaza-text-muted hover:bg-ecoplaza-background hover:text-ecoplaza-text"
            }`
          }
        >
          <Users size={20} strokeWidth={2.2} />
          <span>{t("navigation.buyers")}</span>
        </NavLink>

        <NavLink
          to="/sales"
          className={({ isActive }) =>
            `mt-1.5 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${
              isActive
                ? "bg-ecoplaza-primary text-white"
                : "text-ecoplaza-text-muted hover:bg-ecoplaza-background hover:text-ecoplaza-text"
            }`
          }
        >
          <ShoppingCart size={20} strokeWidth={2.2} />
          <span>{t("navigation.sales")}</span>
        </NavLink>

        <NavLink
          to="/reports"
          className={({ isActive }) =>
            `mt-1.5 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${
              isActive
                ? "bg-ecoplaza-primary text-white"
                : "text-ecoplaza-text-muted hover:bg-ecoplaza-background hover:text-ecoplaza-text"
            }`
          }
        >
          <ChartNoAxesCombined size={20} strokeWidth={2.2} />
          <span>{t("navigation.reports")}</span>
        </NavLink>
        <NavLink
          to="/assistant"
          className={({ isActive }) =>
            `mt-1.5 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${
              isActive
                ? "bg-ecoplaza-primary text-white"
                : "text-ecoplaza-text-muted hover:bg-ecoplaza-background hover:text-ecoplaza-text"
            }`
          }
        >
          <Bot size={20} strokeWidth={2.2} />
          <span>{t("navigation.assistant")}</span>
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `mt-1.5 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${
              isActive
                ? "bg-ecoplaza-primary text-white"
                : "text-ecoplaza-text-muted hover:bg-ecoplaza-background hover:text-ecoplaza-text"
            }`
          }
        >
          <Settings size={20} strokeWidth={2.2} />
          <span>{t("navigation.settings")}</span>
        </NavLink>
      </nav>

      {user && (
        <div className="mt-6 min-w-0 border-t border-ecoplaza-border pt-3">
          <NavLink
            to="/profile"
            aria-label={t("navigation.profile")}
            className={({ isActive }) =>
              `flex min-w-0 items-center gap-3 rounded-xl p-2 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary motion-reduce:transition-none ${
                isActive
                  ? "bg-ecoplaza-background"
                  : "hover:bg-ecoplaza-background"
              }`
            }
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ecoplaza-primary/10 text-ecoplaza-primary-dark">
              <UserRound size={21} strokeWidth={1.9} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p
                className="truncate text-sm font-semibold text-ecoplaza-text"
                title={user.name}
              >
                {user.name}
              </p>
              <p
                className="mt-1 truncate text-xs text-ecoplaza-text-muted"
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
        className="mt-3 flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium text-ecoplaza-text-muted transition-colors duration-150 hover:bg-ecoplaza-background hover:text-ecoplaza-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ecoplaza-primary motion-reduce:transition-none"
      >
        <LogOut size={20} strokeWidth={2.2} aria-hidden="true" />
        <span>{t("navigation.signOut")}</span>
      </button>
    </aside>
  );
}

export default Sidebar;
