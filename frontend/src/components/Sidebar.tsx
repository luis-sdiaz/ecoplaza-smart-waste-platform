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
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

function Sidebar() {
  const { t } = useTranslation();
  return (
    <aside className="min-h-screen w-64 shrink-0 border-r border-ecoplaza-border bg-ecoplaza-surface p-6">
      <div className="mb-8 flex items-center gap-3">
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

      <nav>
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
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
            `mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
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
            `mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
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
            `mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
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
            `mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
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
            `mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
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
            `mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
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
            `mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
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
            `mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
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
    </aside>
  );
}

export default Sidebar;
