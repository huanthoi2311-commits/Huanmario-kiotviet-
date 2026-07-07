import { Router } from "express";
import { db } from "../db.js";

const router = Router();

router.get("/", (req, res) => {
  const { search } = req.query;
  let sql = "SELECT * FROM customers WHERE 1=1";
  const params = [];
  if (search) {
    sql += " AND (name LIKE ? OR phone LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += " ORDER BY id DESC";
  res.json(db.prepare(sql).all(...params));
});

router.get("/:id", (req, res) => {
  const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id);
  if (!customer) return res.status(404).json({ error: "Không tìm thấy khách hàng" });
  const orders = db
    .prepare("SELECT * FROM orders WHERE customer_id = ? ORDER BY date DESC")
    .all(req.params.id);
  res.json({ ...customer, orders });
});

router.post("/", (req, res) => {
  const { name, phone, email, address } = req.body || {};
  if (!name) return res.status(400).json({ error: "Thiếu tên khách hàng" });
  const result = db
    .prepare("INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)")
    .run(name, phone || null, email || null, address || null);
  res.status(201).json(db.prepare("SELECT * FROM customers WHERE id = ?").get(result.lastInsertRowid));
});

router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Không tìm thấy khách hàng" });
  const { name, phone, email, address, debtAmount } = req.body || {};
  db.prepare(
    "UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, debt_amount = ? WHERE id = ?"
  ).run(
    name ?? existing.name,
    phone ?? existing.phone,
    email ?? existing.email,
    address ?? existing.address,
    debtAmount ?? existing.debt_amount,
    req.params.id
  );
  res.json(db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id));
});

router.delete("/:id", (req, res) => {
  const usedInOrders = db.prepare("SELECT COUNT(*) AS c FROM orders WHERE customer_id = ?").get(req.params.id).c;
  if (usedInOrders > 0) {
    return res.status(400).json({ error: "Không thể xóa khách hàng đã có lịch sử đơn hàng" });
  }
  db.prepare("DELETE FROM customers WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

export default router;
