import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import DataTable from "../components/DataTable.jsx";
import ExportButton from "../components/ExportButton.jsx";
import { formatCurrency, formatDateTime } from "../utils/format.js";

export default function Orders({ channel, title = "Đơn hàng", endpoint = "/orders" }) {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [items, setItems] = useState([{ productId: "", qty: 1 }]);

  function load() {
    api.get(endpoint).then(setOrders);
  }

  useEffect(() => {
    load();
    api.get("/customers").then(setCustomers);
    api.get("/employees").then(setEmployees);
    api.get("/products").then(setProducts);
  }, [endpoint]);

  function openCreate() {
    setCustomerId("");
    setEmployeeId("");
    setPaymentStatus("paid");
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
    return sum + (product ? product.price * Number(it.qty || 0) : 0);
  }, 0);

  async function handleSubmit(e) {
    e.preventDefault();
    const validItems = items
      .filter((it) => it.productId)
      .map((it) => {
        const product = products.find((p) => p.id === Number(it.productId));
        return { productId: Number(it.productId), qty: Number(it.qty), price: product.price };
      });
    if (validItems.length === 0) return;
    await api.post(endpoint, {
      customerId: customerId || null,
      employeeId: employeeId || null,
      paymentStatus,
      channel,
      items: validItems,
    });
    setModalOpen(false);
    load();
  }

  const columns = [
    { key: "code", header: "Mã đơn" },
    { key: "date", header: "Ngày tạo", render: (r) => formatDateTime(r.date), exportValue: (r) => formatDateTime(r.date) },
    { key: "customerName", header: "Khách hàng", render: (r) => r.customerName || "Khách lẻ", exportValue: (r) => r.customerName || "Khách lẻ" },
    { key: "employeeName", header: "Nhân viên", render: (r) => r.employeeName || "-", exportValue: (r) => r.employeeName || "" },
    { key: "total_amount", header: "Giá trị", render: (r) => formatCurrency(r.total_amount), exportValue: (r) => r.total_amount },
    {
      key: "payment_status",
      header: "Thanh toán",
      render: (r) => (
        <span className={"badge " + (r.payment_status === "paid" ? "badge-green" : "badge-orange")}>
          {r.payment_status === "paid" ? "Đã thanh toán" : "Còn nợ"}
        </span>
      ),
      exportValue: (r) => (r.payment_status === "paid" ? "Đã thanh toán" : "Còn nợ"),
    },
  ];

  return (
    <div className="page">
      <h1 className="page-title">{title}</h1>
      <div className="toolbar">
        <div />
        <div style={{ display: "flex", gap: 10 }}>
          <ExportButton filename={endpoint.replace("/", "") || "don-hang"} columns={columns} rows={orders} />
          <button className="btn btn-primary" onClick={openCreate}>+ Tạo đơn hàng</button>
        </div>
      </div>
      <div className="card">
        <DataTable columns={columns} rows={orders} emptyText="Chưa có đơn hàng nào" />
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Tạo đơn hàng</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <label>Khách hàng</label>
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">Khách lẻ</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label>Nhân viên bán hàng</label>
                <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                  <option value="">-- Chọn nhân viên --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label>Sản phẩm</label>
                {items.map((it, i) => (
                  <div className="item-row" key={i}>
                    <select value={it.productId} onChange={(e) => updateItem(i, "productId", e.target.value)} required>
                      <option value="">-- Chọn hàng --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.price)})</option>
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
              <div className="form-row">
                <label>Trạng thái thanh toán</label>
                <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                  <option value="paid">Đã thanh toán</option>
                  <option value="unpaid">Ghi nợ</option>
                </select>
              </div>
              <div style={{ textAlign: "right", fontWeight: 700, marginBottom: 10 }}>
                Tổng tiền: {formatCurrency(total)}
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Tạo đơn</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
