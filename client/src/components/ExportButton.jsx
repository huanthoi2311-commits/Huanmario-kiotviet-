import { useState } from "react";
import { exportToExcel } from "../utils/exportExcel.js";

export default function ExportButton({ filename, columns, rows, fetchRows, label = "Xuất Excel", className = "btn btn-secondary" }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (fetchRows) {
      setLoading(true);
      try {
        exportToExcel(filename, columns, await fetchRows());
      } finally {
        setLoading(false);
      }
    } else {
      exportToExcel(filename, columns, rows);
    }
  }

  return (
    <button
      type="button"
      className={className}
      disabled={fetchRows ? loading : !rows || rows.length === 0}
      onClick={handleClick}
    >
      ⬇ {loading ? "Đang xuất..." : label}
    </button>
  );
}
