import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import DataTable from "../components/DataTable.jsx";
import ExportButton from "../components/ExportButton.jsx";
import { formatCurrency } from "../utils/format.js";

const emptyForm = { name: "", sku: "", categoryId: "", unit: "Cái", price: 0, cost: 0, stockQty: 0 };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  function load() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    api.get(`/products?${params.toString()}`).then(setProducts);
  }

  useEffect(() => {
    api.get("/products/categories").then(setCategories);
  }, []);

  useEffect(load, [search]);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(p) {
    setForm({ name: p.name, sku: p.sku, categoryId: p.category_id || "", unit: p.unit, price: p.price, cost: p.cost, stockQty: p.stock_qty });
    setEditingId(p.id);
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form, price: Number(form.price), cost: Number(form.cost), stockQty: Number(form.stockQty), categoryId: form.categoryId || null };
    if (editingId) {
      await api.put(`/products/${editingId}`, payload);
    } else {
      await api.post("/products", payload);
    }
    setModalOpen(false);
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Xóa hàng hóa này?")) return;
    await api.del(`/products/${id}`);
    load();
  }

  const columns = [
    { key: "sku", header: "Mã hàng" },
    { key: "name", header: "Tên hàng" },
    { key: "categoryName", header: "Nhóm hàng", render: (r) => r.categoryName || "-", exportValue: (r) => r.categoryName || "" },
    { key: "unit", header: "Đơn vị" },
    { key: "price", header: "Giá bán", render: (r) => formatCurrency(r.price), exportValue: (r) => r.price },
    { key: "stock_qty", header: "Tồn kho" },
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
      <h1 className="page-title">Hàng hóa</h1>
      <div className="toolbar">
        <div className="filters">
          <input placeholder="Tìm theo tên hoặc mã hàng..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <ExportButton filename="hang-hoa" columns={columns} rows={products} />
          <button className="btn btn-primary" onClick={openCreate}>+ Thêm hàng hóa</button>
        </div>
      </div>
      <div className="card">
        <DataTable columns={columns} rows={products} />
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? "Sửa hàng hóa" : "Thêm hàng hóa"}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <label>Tên hàng</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-row">
                <label>Mã hàng (SKU)</label>
                <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
              </div>
              <div className="form-row">
                <label>Nhóm hàng</label>
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">-- Chọn nhóm --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label>Đơn vị tính</label>
                <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
              <div className="form-row">
                <label>Giá bán</label>
                <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="form-row">
                <label>Giá vốn</label>
                <input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
              </div>
              <div className="form-row">
                <label>Tồn kho</label>
                <input type="number" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} />
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
