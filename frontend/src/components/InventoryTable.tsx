interface InventoryItem {
  id: string;
  category: string;
  quantity: number;
  unitPrice: number;
  status: string;
}

interface InventoryTableProps {
  items: InventoryItem[];
}

function InventoryTable({ items }: InventoryTableProps) {
  const currencyFormatter = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface">
      <table className="w-full">
        <thead className="bg-ecoplaza-background">
          <tr>
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              Lote
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              Categoría
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              Cantidad
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              Precio por kg
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              Valor estimado
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              Estado
            </th>
          </tr>
        </thead>

        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-ecoplaza-border">
              <td className="px-5 py-4 text-sm font-medium text-ecoplaza-text">
                {item.id}
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text">
                {item.category}
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text">
                {item.quantity} kg
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text">
                {currencyFormatter.format(item.unitPrice)}
              </td>

              <td className="px-5 py-4 text-sm font-medium text-ecoplaza-text">
                {currencyFormatter.format(item.quantity * item.unitPrice)}
              </td>

              <td className="px-5 py-4">
                <span className="rounded-full bg-ecoplaza-background px-3 py-1 text-xs font-medium text-ecoplaza-primary">
                  {item.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default InventoryTable;
