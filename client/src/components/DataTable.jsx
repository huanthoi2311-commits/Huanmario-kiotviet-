export default function DataTable({ columns, rows, rowKey = "id", emptyText = "Chưa có dữ liệu" }) {
  if (!rows || rows.length === 0) {
    return <div className="empty-state">{emptyText}</div>;
  }
  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row[rowKey]}>
            {columns.map((col) => (
              <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
