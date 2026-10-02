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

function Sidebar() {
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
            Gestión inteligente
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
          <span>Inicio</span>
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
          <span>Sensores</span>
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
          <span>Residuos</span>
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
          <span>Inventario</span>
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
          <span>Compradores</span>
        </NavLink>

        <button
          type="button"
          className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-background hover:text-ecoplaza-text"
        >
          <ShoppingCart size={20} strokeWidth={2.2} />
          <span>Ventas</span>
        </button>

        <button
          type="button"
          className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-background hover:text-ecoplaza-text"
        >
          <ChartNoAxesCombined size={20} strokeWidth={2.2} />
          <span>Reportes</span>
        </button>

        <button
          type="button"
          className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-background hover:text-ecoplaza-text"
        >
          <Bot size={20} strokeWidth={2.2} />
          <span>Asistente IA</span>
        </button>

        <button
          type="button"
          className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-background hover:text-ecoplaza-text"
        >
          <Settings size={20} strokeWidth={2.2} />
          <span>Configuración</span>
        </button>
      </nav>
    </aside>
  );
}

export default Sidebar;
