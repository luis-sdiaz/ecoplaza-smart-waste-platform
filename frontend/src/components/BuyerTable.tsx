interface Buyer {
  id: string;
  name: string;
  type: string;
  interest: string;
  contact: string;
  status: string;
}

interface BuyerTableProps {
  buyers: Buyer[];
}

function BuyerTable({ buyers }: BuyerTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface">
      <table className="w-full">
        <thead className="bg-ecoplaza-background">
          <tr>
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              Código
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              Comprador
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              Tipo
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              Interés
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              Contacto
            </th>

            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              Estado
            </th>
          </tr>
        </thead>

        <tbody>
          {buyers.map((buyer) => (
            <tr key={buyer.id} className="border-t border-ecoplaza-border">
              <td className="px-5 py-4 text-sm font-medium text-ecoplaza-text">
                {buyer.id}
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text">
                {buyer.name}
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">
                {buyer.type}
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text">
                {buyer.interest}
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">
                {buyer.contact}
              </td>

              <td className="px-5 py-4">
                <span className="rounded-full bg-ecoplaza-background px-3 py-1 text-xs font-medium text-ecoplaza-primary">
                  {buyer.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BuyerTable;
