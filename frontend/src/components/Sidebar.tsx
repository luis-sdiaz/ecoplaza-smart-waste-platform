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
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl bg-ecoplaza-primary px-4 py-3 text-left text-sm font-medium text-white"
        >
          <House size={20} strokeWidth={2.2} />
          <span>Inicio</span>
        </button>
        <button
          type="button"
          className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-background hover:text-ecoplaza-text"
        >
          <SlidersHorizontal size={20} strokeWidth={2.2} />
          <span>Sensores</span>
        </button>
        <button
          type="button"
          className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-background hover:text-ecoplaza-text"
        >
          <Recycle size={20} strokeWidth={2.2} />
          <span>Residuos</span>
        </button>
        <button
          type="button"
          className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-background hover:text-ecoplaza-text"
        >
          <PackageOpen size={20} strokeWidth={2.2} />
          <span>Inventario</span>
        </button>
        <button
          type="button"
          className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-ecoplaza-text-muted transition-colors hover:bg-ecoplaza-background hover:text-ecoplaza-text"
        >
          <Users size={20} strokeWidth={2.2} />
          <span>Compradores</span>
        </button>
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
