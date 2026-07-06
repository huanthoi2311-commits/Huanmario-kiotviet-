import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import DataTable from "../components/DataTable.jsx";
import ExportButton from "../components/ExportButton.jsx";
import { formatCurrency, formatDateTime } from "../utils/format.js";

const emptyForm = { type: "in", amount: "", description: "", category: "", method: "cash" };

export default function CashBook() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  function load() {
    api.get("/cashbook").then(setTransactions);
    api.get("/cashbook/summary").then(setSummary);
  }

  useEffect(load, []);

  function openCreate() {
    setForm(emptyForm);
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await api.post("/cashbook", { ...form, amount: Number(form.amount) });
    setModalOpen(false);
    load();
  }

  const columns = [
    { key: "date", header: "Ngày", render: (r) => formatDateTime(r.date), exportValue: (r) => formatDateTime(r.date) },
    {
      key: "type",
      header: "Loại",
      render: (r) => <span className={"badge " + (r.type === "in" ? "badge-green" : "badge-red")}>{r.type === "in" ? "Phiếu thu" : "Phiếu chi"}</span>,
      exportValue: (r) => (r.type === "in" ? "Phiếu thu" : "Phiếu chi"),
    },
    { key: "description", header: "Diễn giải", render: (r) => r.description || "-", exportValue: (r) => r.description || "" },
    { key: "amount", header: "Số tiền", render: (r) => formatCurrency(r.amount), exportValue: (r) => r.amount },
    { key: "runningBalance", header: "Tồn quỹ", render: (r) => formatCurrency(r.runningBalance), exportValue: (r) => r.runningBalance },
  ];

  return (
    <div className="page">
      <h1 className="page-title">Sổ quỹ</h1>
      <div className="stat-row" style={{ marginBottom: 16 }}>
        <div className="card" style={{ flex: 1, margin: 0 }}>
          <div className="stat-label">Tổng thu</div>
          <div className="stat-value" style={{ color: "var(--green)" }}>{summary ? formatCurrency(summary.totalIn) : "..."}</div>
        </div>
        <div className="card" style={{ flex: 1, margin: 0 }}>
          <div className="stat-label">Tổng chi</div>
          <div className="stat-value" style={{ color: "var(--red)" }}>{summary ? formatCurrency(summary.totalOut) : "..."}</div>
        </div>
        <div className="card" style={{ flex: 1, margin: 0 }}>
          <div className="stat-label">Tồn quỹ</div>
          <div className="stat-value">{summary ? formatCurrency(summary.balance) : "..."}</div>
        </div>
      </div>
      <div className="toolbar">
        <div />
        <div style={{ display: "flex", gap: 10 }}>
          <ExportButton filename="so-quy" columns={columns} rows={transactions} />
          <button className="btn btn-primary" onClick={openCreate}>+ Tạo phiếu thu/chi</button>
        </div>
      </div>
      <div className="card">
        <DataTable columns={columns} rows={transactions} emptyText="Chưa có phiếu thu/chi nào" />
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Tạo phiếu thu/chi</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <label>Loại phiếu</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="in">Phiếu thu</option>
                  <option value="out">Phiếu chi</option>
                </select>
              </div>
              <div className="form-row">
                <label>Số tiền</label>
                <input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div className="form-row">
                <label>Diễn giải</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="form-row">
                <label>Hình thức</label>
                <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                  <option value="cash">Tiền mặt</option>
                  <option value="bank">Chuyển khoản</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
