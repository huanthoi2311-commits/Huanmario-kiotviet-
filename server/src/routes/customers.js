import { Router } from "express";
import { db } from "../db.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search } = req.query;
    let sql = "SELECT * FROM customers WHERE 1=1";
    const params = [];
    if (search) {
      sql += " AND (name ILIKE ? OR phone ILIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += " ORDER BY id DESC";
    res.json(await db.prepare(sql).all(...params));
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const customer = await db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id);
    if (!customer) return res.status(404).json({ error: "Không tìm thấy khách hàng" });
    const orders = await db.prepare("SELECT * FROM orders WHERE customer_id = ? ORDER BY date DESC").all(req.params.id);
    res.json({ ...customer, orders });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, phone, email, address } = req.body || {};
    if (!name) return res.status(400).json({ error: "Thiếu tên khách hàng" });
    const result = await db
      .prepare("INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?) RETURNING id")
      .run(name, phone || null, email || null, address || null);
    res.status(201).json(await db.prepare("SELECT * FROM customers WHERE id = ?").get(result.lastInsertRowid));
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Không tìm thấy khách hàng" });
    const { name, phone, email, address, debtAmount } = req.body || {};
    await db
      .prepare("UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, debt_amount = ? WHERE id = ?")
      .run(
        name ?? existing.name,
        phone ?? existing.phone,
        email ?? existing.email,
        address ?? existing.address,
        debtAmount ?? existing.debt_amount,
        req.params.id
      );
    res.json(await db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id));
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const usedInOrders = (
      await db.prepare("SELECT COUNT(*) AS c FROM orders WHERE customer_id = ?").get(req.params.id)
    ).c;
    if (usedInOrders > 0) {
      return res.status(400).json({ error: "Không thể xóa khách hàng đã có lịch sử đơn hàng" });
    }
    await db.prepare("DELETE FROM customers WHERE id = ?").run(req.params.id);
    res.status(204).end();
  })
);

export default router;
