import { Router } from "express";
import { db } from "../db.js";

const router = Router();

router.get("/categories", (req, res) => {
  res.json(db.prepare("SELECT * FROM categories ORDER BY name").all());
});

router.get("/", (req, res) => {
  const { search, categoryId } = req.query;
  let sql = `SELECT p.*, c.name AS categoryName FROM products p
             LEFT JOIN categories c ON c.id = p.category_id WHERE 1=1`;
  const params = [];
  if (search) {
    sql += " AND (p.name LIKE ? OR p.sku LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  if (categoryId) {
    sql += " AND p.category_id = ?";
    params.push(categoryId);
  }
  sql += " ORDER BY p.id DESC";
  res.json(db.prepare(sql).all(...params));
});

router.get("/:id", (req, res) => {
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!product) return res.status(404).json({ error: "Không tìm thấy hàng hóa" });
  res.json(product);
});

router.post("/", (req, res) => {
  const { name, sku, categoryId, unit, price, cost, stockQty } = req.body || {};
  if (!name || !sku) return res.status(400).json({ error: "Thiếu tên hoặc mã hàng" });
  const result = db
    .prepare(
      `INSERT INTO products (name, sku, category_id, unit, price, cost, stock_qty)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(name, sku, categoryId || null, unit || "Cái", price || 0, cost || 0, stockQty || 0);
  res.status(201).json(db.prepare("SELECT * FROM products WHERE id = ?").get(result.lastInsertRowid));
});

router.put("/:id", (req, res) => {
  const { name, sku, categoryId, unit, price, cost, stockQty } = req.body || {};
  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Không tìm thấy hàng hóa" });
  db.prepare(
    `UPDATE products SET name = ?, sku = ?, category_id = ?, unit = ?, price = ?, cost = ?, stock_qty = ?
     WHERE id = ?`
  ).run(
    name ?? existing.name,
    sku ?? existing.sku,
    categoryId ?? existing.category_id,
    unit ?? existing.unit,
    price ?? existing.price,
    cost ?? existing.cost,
    stockQty ?? existing.stock_qty,
    req.params.id
  );
  res.json(db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id));
});

router.delete("/:id", (req, res) => {
  const usedInOrders = db.prepare("SELECT COUNT(*) AS c FROM order_items WHERE product_id = ?").get(req.params.id).c;
  const usedInPurchases = db
    .prepare("SELECT COUNT(*) AS c FROM purchase_items WHERE product_id = ?")
    .get(req.params.id).c;
  if (usedInOrders > 0 || usedInPurchases > 0) {
    return res.status(400).json({ error: "Không thể xóa hàng hóa đã có lịch sử đơn hàng hoặc nhập hàng" });
  }
  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

export default router;
