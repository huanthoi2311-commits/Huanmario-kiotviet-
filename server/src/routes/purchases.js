import { Router } from "express";
import { db, logActivity } from "../db.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(
  "/suppliers",
  asyncHandler(async (req, res) => {
    res.json(await db.prepare("SELECT * FROM suppliers ORDER BY name").all());
  })
);

router.post(
  "/suppliers",
  asyncHandler(async (req, res) => {
    const { name, phone, address } = req.body || {};
    if (!name) return res.status(400).json({ error: "Thiếu tên nhà cung cấp" });
    const result = await db
      .prepare("INSERT INTO suppliers (name, phone, address) VALUES (?, ?, ?) RETURNING id")
      .run(name, phone || null, address || null);
    res.status(201).json(await db.prepare("SELECT * FROM suppliers WHERE id = ?").get(result.lastInsertRowid));
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const rows = await db
      .prepare(
        `SELECT p.*, s.name AS "supplierName" FROM purchases p
       LEFT JOIN suppliers s ON s.id = p.supplier_id ORDER BY p.date DESC`
      )
      .all();
    res.json(rows);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const purchase = await db.prepare("SELECT * FROM purchases WHERE id = ?").get(req.params.id);
    if (!purchase) return res.status(404).json({ error: "Không tìm thấy phiếu nhập" });
    const items = await db
      .prepare(
        `SELECT pi.*, pr.name AS "productName" FROM purchase_items pi
       JOIN products pr ON pr.id = pi.product_id WHERE pi.purchase_id = ?`
      )
      .all(req.params.id);
    res.json({ ...purchase, items });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { supplierId, items, employeeName } = req.body || {};
    if (!supplierId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Thiếu nhà cung cấp hoặc danh sách hàng" });
    }
    const total = items.reduce((sum, it) => sum + it.qty * it.price, 0);
    const code = `PN${String(Date.now()).slice(-8)}`;
    const now = new Date().toISOString();

    const purchaseResult = await db
      .prepare(
        "INSERT INTO purchases (code, supplier_id, date, status, total_amount) VALUES (?, ?, ?, 'completed', ?) RETURNING id"
      )
      .run(code, supplierId, now, total);
    const purchaseId = purchaseResult.lastInsertRowid;

    for (const it of items) {
      await db
        .prepare("INSERT INTO purchase_items (purchase_id, product_id, qty, price) VALUES (?, ?, ?, ?)")
        .run(purchaseId, it.productId, it.qty, it.price);
      await db.prepare("UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?").run(it.qty, it.productId);
    }

    await logActivity(
      "purchase",
      `${employeeName || "Người dùng"} vừa nhập hàng với giá trị ${total.toLocaleString("vi-VN")}`,
      "purchase",
      purchaseId
    );

    res.status(201).json(await db.prepare("SELECT * FROM purchases WHERE id = ?").get(purchaseId));
  })
);

export default router;
