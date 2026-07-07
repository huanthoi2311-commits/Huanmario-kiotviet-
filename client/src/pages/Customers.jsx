import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import DataTable from "../components/DataTable.jsx";
import ExportButton from "../components/ExportButton.jsx";
import { formatCurrency } from "../utils/format.js";

const emptyForm = { name: "", phone: "", email: "", address: "" };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  function load() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    api.get(`/customers?${params.toString()}`).then(setCustomers);
  }

  useEffect(load, [search]);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(c) {
    setForm({ name: c.name, phone: c.phone || "", email: c.email || "", address: c.address || "" });
    setEditingId(c.id);
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (editingId) {
      await api.put(`/customers/${editingId}`, form);
    } else {
      await api.post("/customers", form);
    }
    setModalOpen(false);
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Xóa khách hàng này?")) return;
    try {
      await api.del(`/customers/${id}`);
    } catch (err) {
      alert(err.message);
      return;
    }
    load();
  }

  const columns = [
    { key: "name", header: "Tên khách hàng" },
    { key: "phone", header: "Điện thoại", render: (r) => r.phone || "-", exportValue: (r) => r.phone || "" },
    { key: "email", header: "Email", render: (r) => r.email || "-", exportValue: (r) => r.email || "" },
    {
      key: "debt_amount",
      header: "Công nợ",
      render: (r) => (r.debt_amount > 0 ? <span className="badge badge-orange">{formatCurrency(r.debt_amount)}</span> : "-"),
      exportValue: (r) => r.debt_amount,
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <>
          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(r)}>Sửa</button>{" "}
          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>Xóa</button>
        </>
      ),
    },
  ];

  return (
    <div className="page">
      <h1 className="page-title">Khách hàng</h1>
      <div className="toolbar">
        <div className="filters">
          <input placeholder="Tìm theo tên hoặc SĐT..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <ExportButton filename="khach-hang" columns={columns} rows={customers} />
          <button className="btn btn-primary" onClick={openCreate}>+ Thêm khách hàng</button>
        </div>
      </div>
      <div className="card">
        <DataTable columns={columns} rows={customers} />
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? "Sửa khách hàng" : "Thêm khách hàng"}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <label>Tên khách hàng</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-row">
                <label>Điện thoại</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="form-row">
                <label>Email</label>
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-row">
                <label>Địa chỉ</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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
