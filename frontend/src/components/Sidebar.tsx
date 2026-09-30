import { House, Leaf } from "lucide-react";

function Sidebar() {
  return (
    <aside>
      <div>
        <Leaf size={28} />
        <span>EcoPlaza</span>
      </div>

      <nav>
        <button type="button">
          <House size={20} />
          <span>Inicio</span>
        </button>
      </nav>
    </aside>
  );
}

export default Sidebar;
