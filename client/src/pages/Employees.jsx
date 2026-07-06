import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import DataTable from "../components/DataTable.jsx";
import ExportButton from "../components/ExportButton.jsx";

const emptyForm = { name: "", role: "", phone: "", email: "" };

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  function load() {
    api.get("/employees").then(setEmployees);
  }

  useEffect(load, []);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(e) {
    setForm({ name: e.name, role: e.role, phone: e.phone || "", email: e.email || "" });
    setEditingId(e.id);
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (editingId) {
      await api.put(`/employees/${editingId}`, form);
    } else {
      await api.post("/employees", form);
    }
    setModalOpen(false);
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Xóa nhân viên này?")) return;
    await api.del(`/employees/${id}`);
    load();
  }

  const columns = [
    { key: "name", header: "Tên nhân viên" },
    { key: "role", header: "Chức vụ" },
    { key: "phone", header: "Điện thoại", render: (r) => r.phone || "-", exportValue: (r) => r.phone || "" },
    { key: "email", header: "Email", render: (r) => r.email || "-", exportValue: (r) => r.email || "" },
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
      <h1 className="page-title">Nhân viên</h1>
      <div className="toolbar">
        <div />
        <div style={{ display: "flex", gap: 10 }}>
          <ExportButton filename="nhan-vien" columns={columns} rows={employees} />
          <button className="btn btn-primary" onClick={openCreate}>+ Thêm nhân viên</button>
        </div>
      </div>
      <div className="card">
        <DataTable columns={columns} rows={employees} />
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? "Sửa nhân viên" : "Thêm nhân viên"}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <label>Tên nhân viên</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-row">
                <label>Chức vụ</label>
                <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required />
              </div>
              <div className="form-row">
                <label>Điện thoại</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="form-row">
                <label>Email</label>
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
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
