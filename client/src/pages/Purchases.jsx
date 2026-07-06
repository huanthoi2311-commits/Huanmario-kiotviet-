import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import DataTable from "../components/DataTable.jsx";
import ExportButton from "../components/ExportButton.jsx";
import { formatCurrency, formatDateTime } from "../utils/format.js";

export default function Purchases() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState([{ productId: "", qty: 1 }]);

  function load() {
    api.get("/purchases").then(setPurchases);
  }

  useEffect(() => {
    load();
    api.get("/purchases/suppliers").then(setSuppliers);
    api.get("/products").then(setProducts);
  }, []);

  function openCreate() {
    setSupplierId("");
    setItems([{ productId: "", qty: 1 }]);
    setModalOpen(true);
  }

  function updateItem(index, field, value) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }

  function addItemRow() {
    setItems((prev) => [...prev, { productId: "", qty: 1 }]);
  }

  function removeItemRow(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const total = items.reduce((sum, it) => {
    const product = products.find((p) => p.id === Number(it.productId));
    return sum + (product ? product.cost * Number(it.qty || 0) : 0);
  }, 0);

  async function handleSubmit(e) {
    e.preventDefault();
    const validItems = items
      .filter((it) => it.productId)
      .map((it) => {
        const product = products.find((p) => p.id === Number(it.productId));
        return { productId: Number(it.productId), qty: Number(it.qty), price: product.cost };
      });
    if (!supplierId || validItems.length === 0) return;
    await api.post("/purchases", { supplierId: Number(supplierId), items: validItems, employeeName: user?.fullName });
    setModalOpen(false);
    load();
  }

  const columns = [
    { key: "code", header: "Mã phiếu" },
    { key: "date", header: "Ngày nhập", render: (r) => formatDateTime(r.date), exportValue: (r) => formatDateTime(r.date) },
    { key: "supplierName", header: "Nhà cung cấp", render: (r) => r.supplierName || "-", exportValue: (r) => r.supplierName || "" },
    { key: "total_amount", header: "Giá trị", render: (r) => formatCurrency(r.total_amount), exportValue: (r) => r.total_amount },
  ];

  return (
    <div className="page">
      <h1 className="page-title">Mua hàng</h1>
      <div className="toolbar">
        <div />
        <div style={{ display: "flex", gap: 10 }}>
          <ExportButton filename="mua-hang" columns={columns} rows={purchases} />
          <button className="btn btn-primary" onClick={openCreate}>+ Tạo phiếu nhập</button>
        </div>
      </div>
      <div className="card">
        <DataTable
          columns={columns}
          rows={purchases}
          emptyText="Chưa có phiếu nhập nào"
        />
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Tạo phiếu nhập hàng</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <label>Nhà cung cấp</label>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
                  <option value="">-- Chọn nhà cung cấp --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label>Hàng hóa nhập</label>
                {items.map((it, i) => (
                  <div className="item-row" key={i}>
                    <select value={it.productId} onChange={(e) => updateItem(i, "productId", e.target.value)} required>
                      <option value="">-- Chọn hàng --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.cost)})</option>
                      ))}
                    </select>
                    <input type="number" min="1" value={it.qty} onChange={(e) => updateItem(i, "qty", e.target.value)} />
                    {items.length > 1 && (
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => removeItemRow(i)}>✕</button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-sm" onClick={addItemRow}>+ Thêm dòng</button>
              </div>
              <div style={{ textAlign: "right", fontWeight: 700, marginBottom: 10 }}>
                Tổng tiền nhập: {formatCurrency(total)}
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Tạo phiếu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
