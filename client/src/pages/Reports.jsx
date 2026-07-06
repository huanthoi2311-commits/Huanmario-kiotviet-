import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import DataTable from "../components/DataTable.jsx";
import ExportButton from "../components/ExportButton.jsx";
import RevenueChart from "../components/RevenueChart.jsx";
import { formatCurrency } from "../utils/format.js";

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export default function Reports() {
  const [range, setRange] = useState(defaultRange());
  const [revenue, setRevenue] = useState({ rows: [], totals: { revenue: 0, orders: 0 } });
  const [topProducts, setTopProducts] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);

  function load() {
    const qs = `start=${range.start}&end=${range.end}`;
    api.get(`/reports/revenue?${qs}`).then(setRevenue);
    api.get(`/reports/top-products?${qs}`).then(setTopProducts);
    api.get(`/reports/top-customers?${qs}`).then(setTopCustomers);
  }

  useEffect(load, [range.start, range.end]);

  const chartData = revenue.rows.map((r) => ({ label: r.day.slice(5), revenue: r.revenue }));

  const productColumns = [
    { key: "name", header: "Tên hàng" },
    { key: "qty", header: "SL bán" },
    { key: "revenue", header: "Doanh thu", render: (r) => formatCurrency(r.revenue), exportValue: (r) => r.revenue },
  ];

  const customerColumns = [
    { key: "name", header: "Khách hàng" },
    { key: "orderCount", header: "Số đơn" },
    { key: "spend", header: "Chi tiêu", render: (r) => formatCurrency(r.spend), exportValue: (r) => r.spend },
  ];

  return (
    <div className="page">
      <h1 className="page-title">Báo cáo</h1>
      <div className="toolbar">
        <div className="filters">
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Từ <input type="date" value={range.start} onChange={(e) => setRange({ ...range, start: e.target.value })} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Đến <input type="date" value={range.end} onChange={(e) => setRange({ ...range, end: e.target.value })} />
          </label>
        </div>
      </div>

      <div className="stat-row" style={{ marginBottom: 16 }}>
        <div className="card" style={{ flex: 1, margin: 0 }}>
          <div className="stat-label">Doanh thu trong kỳ</div>
          <div className="stat-value">{formatCurrency(revenue.totals.revenue)}</div>
        </div>
        <div className="card" style={{ flex: 1, margin: 0 }}>
          <div className="stat-label">Số đơn hàng</div>
          <div className="stat-value">{revenue.totals.orders}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>Doanh thu theo ngày</h3></div>
        <RevenueChart data={chartData} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div className="card" style={{ margin: 0 }}>
          <div className="card-header">
            <h3>Top hàng bán chạy</h3>
            <ExportButton filename="top-hang-ban-chay" columns={productColumns} rows={topProducts} className="btn btn-secondary btn-sm" />
          </div>
          <DataTable columns={productColumns} rows={topProducts} />
        </div>
        <div className="card" style={{ margin: 0 }}>
          <div className="card-header">
            <h3>Top khách hàng</h3>
            <ExportButton filename="top-khach-hang" columns={customerColumns} rows={topCustomers} className="btn btn-secondary btn-sm" />
          </div>
          <DataTable columns={customerColumns} rows={topCustomers} />
        </div>
      </div>
    </div>
  );
}
