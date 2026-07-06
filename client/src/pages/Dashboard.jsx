import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import RevenueChart from "../components/RevenueChart.jsx";
import { formatCurrency, timeAgo } from "../utils/format.js";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [groupBy, setGroupBy] = useState("day");
  const [revenue, setRevenue] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [debtors, setDebtors] = useState([]);

  useEffect(() => {
    api.get("/dashboard/summary").then(setSummary);
    api.get("/dashboard/top-products?limit=10").then(setTopProducts);
    api.get("/dashboard/top-customers?limit=10").then(setTopCustomers);
    api.get("/dashboard/activity?limit=8").then(setActivity);
    api.get("/dashboard/debtors").then(setDebtors);
  }, []);

  useEffect(() => {
    api.get(`/dashboard/revenue?groupBy=${groupBy}`).then(setRevenue);
  }, [groupBy]);

  const totalDebt = debtors.reduce((sum, d) => sum + d.debt_amount, 0);
  const maxDaysOverdue = debtors.reduce((max, d) => Math.max(max, d.daysSince), 0);

  return (
    <div className="page">
      <h1 className="page-title">Tổng quan</h1>
      <div className="grid-dashboard">
        <div>
          <div className="card">
            <div className="card-header"><h3>Kết quả bán hàng hôm nay</h3></div>
            <div className="stat-row">
              <div className="stat-item">
                <div className="stat-icon">💰</div>
                <div>
                  <div className="stat-value">{summary ? formatCurrency(summary.todayRevenue) : "..."}</div>
                  <div className="stat-label">Doanh thu</div>
                  <div className="stat-sub">{summary?.todayOrders ?? 0} hóa đơn</div>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">↩️</div>
                <div>
                  <div className="stat-value">{summary?.returns ?? 0}</div>
                  <div className="stat-label">Trả hàng</div>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">📉</div>
                <div>
                  <div className={"stat-value stat-change " + (summary?.percentChangeVsLastMonth < 0 ? "down" : "up")}>
                    {summary ? `${summary.percentChangeVsLastMonth}%` : "..."}
                  </div>
                  <div className="stat-label">Doanh thu thuần</div>
                  <div className="stat-sub">So với cùng kỳ tháng trước</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Doanh thu thuần <span className="pill-value">{summary ? formatCurrency(summary.netRevenueThisMonth) : "..."}</span></h3>
              <select className="select-mini" defaultValue="month">
                <option value="month">Tháng này</option>
              </select>
            </div>
            <div className="tabs">
              <span className={"tab" + (groupBy === "day" ? " active" : "")} onClick={() => setGroupBy("day")}>Theo ngày</span>
              <span className={"tab" + (groupBy === "hour" ? " active" : "")} onClick={() => setGroupBy("hour")}>Theo giờ</span>
              <span className={"tab" + (groupBy === "weekday" ? " active" : "")} onClick={() => setGroupBy("weekday")}>Theo thứ</span>
            </div>
            <RevenueChart data={revenue} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
            <div className="card" style={{ margin: 0 }}>
              <div className="card-header"><h3>Top 10 hàng bán chạy</h3></div>
              <ul className="top-list">
                {topProducts.map((p, i) => (
                  <li key={p.id}>
                    <span className="rank">{i + 1}</span>
                    <span className="name">{p.name}</span>
                    <span className="value">{p.qty}</span>
                  </li>
                ))}
                {topProducts.length === 0 && <div className="empty-state">Chưa có dữ liệu</div>}
              </ul>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <div className="card-header"><h3>Top 10 khách mua nhiều nhất</h3></div>
              <ul className="top-list">
                {topCustomers.map((c, i) => (
                  <li key={c.id}>
                    <span className="rank">{i + 1}</span>
                    <span className="name">{c.name}</span>
                    <span className="value">{formatCurrency(c.spend)}</span>
                  </li>
                ))}
                {topCustomers.length === 0 && <div className="empty-state">Chưa có dữ liệu</div>}
              </ul>
            </div>
          </div>
        </div>

        <div>
          <div className="card sidebar-widget">
            <div className="icon">💳</div>
            <div>
              <h4>Thanh toán</h4>
              <p>Cài đặt QR tính tiền miễn phí</p>
            </div>
          </div>
          <div className="card sidebar-widget">
            <div className="icon">🏦</div>
            <div>
              <h4>Vay vốn</h4>
              <p>Vay dễ dàng, giải ngân siêu tốc</p>
            </div>
          </div>

          {debtors.length > 0 && (
            <div className="debtor-banner">
              Có <a href="#/customers">{debtors.length} khách hàng</a> đang nợ từ{" "}
              <strong>{formatCurrency(totalDebt)}</strong>
              {maxDaysOverdue > 10 && <> và nợ quá {maxDaysOverdue} ngày</>}.
            </div>
          )}

          <div className="card">
            <div className="card-header"><h3>Hoạt động gần đây</h3></div>
            {activity.map((a) => (
              <div className="activity-item" key={a.id}>
                <div className="dot">{a.type === "purchase" ? "📥" : a.type === "inventory" ? "📋" : "🧾"}</div>
                <div>
                  <div>{a.message}</div>
                  <div className="time">{timeAgo(a.created_at)}</div>
                </div>
              </div>
            ))}
            {activity.length === 0 && <div className="empty-state">Chưa có hoạt động</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
