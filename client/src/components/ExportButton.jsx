import { exportToExcel } from "../utils/exportExcel.js";

export default function ExportButton({ filename, columns, rows, label = "Xuất Excel", className = "btn btn-secondary" }) {
  return (
    <button
      type="button"
      className={className}
      disabled={!rows || rows.length === 0}
      onClick={() => exportToExcel(filename, columns, rows)}
    >
      ⬇ {label}
    </button>
  );
}
