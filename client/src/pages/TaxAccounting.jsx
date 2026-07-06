import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import DataTable from "../components/DataTable.jsx";
import ExportButton from "../components/ExportButton.jsx";
import { formatCurrency } from "../utils/format.js";

export default function TaxAccounting() {
  const [data, setData] = useState({ taxRate: 0, months: [] });

  useEffect(() => {
    api.get("/tax/monthly-summary?months=6").then(setData);
  }, []);

  const columns = [
    { key: "month", header: "Tháng" },
    { key: "revenue", header: "Doanh thu", render: (r) => formatCurrency(r.revenue), exportValue: (r) => r.revenue },
    { key: "cost", header: "Giá vốn", render: (r) => formatCurrency(r.cost), exportValue: (r) => r.cost },
    { key: "grossProfit", header: "Lợi nhuận gộp", render: (r) => formatCurrency(r.grossProfit), exportValue: (r) => r.grossProfit },
    { key: "estimatedTax", header: "Thuế ước tính", render: (r) => formatCurrency(r.estimatedTax), exportValue: (r) => r.estimatedTax },
  ];

  return (
    <div className="page">
      <h1 className="page-title">Thuế &amp; Kế toán</h1>
      <div className="placeholder-note">
        Bảng dưới đây là ước tính đơn giản (thuế khoán {(data.taxRate * 100).toFixed(1)}% trên doanh thu) để tham khảo nhanh,
        không thay thế cho báo cáo thuế chính thức hoặc tư vấn kế toán.
      </div>
      <div className="toolbar">
        <div />
        <ExportButton filename="thue-ke-toan" columns={columns} rows={data.months} />
      </div>
      <div className="card">
        <DataTable columns={columns} rows={data.months} rowKey="month" emptyText="Chưa có dữ liệu" />
      </div>
    </div>
  );
}
