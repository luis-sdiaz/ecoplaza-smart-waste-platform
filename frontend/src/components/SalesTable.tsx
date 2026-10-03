interface Sale {
  id: string;
  buyer: string;
  material: string;
  quantity: number;
  total: number;
  date: string;
  status: string;
}

interface SalesTableProps {
  sales: Sale[];
}

function SalesTable({ sales }: SalesTableProps) {
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
              Venta
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              Comprador
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              Material
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              Cantidad
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              Total
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              Fecha
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              Estado
            </th>
          </tr>
        </thead>

        <tbody>
          {sales.map((sale) => (
            <tr key={sale.id} className="border-t border-ecoplaza-border">
              <td className="px-5 py-4 text-sm font-medium text-ecoplaza-text">
                {sale.id}
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text">
                {sale.buyer}
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text">
                {sale.material}
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text">
                {sale.quantity} kg
              </td>

              <td className="px-5 py-4 text-sm font-medium text-ecoplaza-text">
                {currencyFormatter.format(sale.total)}
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">
                {sale.date}
              </td>

              <td className="px-5 py-4">
                <span className="rounded-full bg-ecoplaza-background px-3 py-1 text-xs font-medium text-ecoplaza-primary">
                  {sale.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SalesTable;
