interface WasteRecord {
  id: string;
  category: string;
  weight: string;
  container: string;
  date: string;
  status: string;
}

interface WasteRecordTableProps {
  records: WasteRecord[];
}

function WasteRecordTable({ records }: WasteRecordTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface">
      <table className="w-full">
        <thead className="bg-ecoplaza-background">
          <tr>
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              Registro
            </th>
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              Categoría
            </th>
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              Peso
            </th>
            <th className="px-5 py-4 text-left text-xs font-semibold text-ecoplaza-text-muted">
              Contenedor
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
          {records.map((record) => (
            <tr key={record.id} className="border-t border-ecoplaza-border">
              <td className="px-5 py-4 text-sm font-medium text-ecoplaza-text">
                {record.id}
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text">
                {record.category}
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text">
                {record.weight}
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">
                {record.container}
              </td>

              <td className="px-5 py-4 text-sm text-ecoplaza-text-muted">
                {record.date}
              </td>

              <td className="px-5 py-4">
                <span className="rounded-full bg-ecoplaza-background px-3 py-1 text-xs font-medium text-ecoplaza-primary">
                  {record.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default WasteRecordTable;
