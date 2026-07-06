function escapeCsvCell(value) {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToExcel(filename, columns, rows) {
  const exportColumns = columns.filter((c) => c.key !== "actions");
  const header = exportColumns.map((c) => escapeCsvCell(c.header)).join(",");
  const lines = rows.map((row) =>
    exportColumns
      .map((c) => escapeCsvCell(c.exportValue ? c.exportValue(row) : row[c.key]))
      .join(",")
  );
  const csv = [header, ...lines].join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
