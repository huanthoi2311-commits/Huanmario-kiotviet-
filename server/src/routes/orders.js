import { Router } from "express";
import { db, logActivity } from "../db.js";

export function buildOrdersRouter(defaultChannel = null) {
  const router = Router();

  router.get("/", async (req, res) => {
    const channel = defaultChannel || req.query.channel;
    let sql = `SELECT o.*, c.name AS "customerName", e.name AS "employeeName"
               FROM orders o
               LEFT JOIN customers c ON c.id = o.customer_id
               LEFT JOIN employees e ON e.id = o.employee_id WHERE 1=1`;
    const params = [];
    if (channel) {
      sql += " AND o.channel = ?";
      params.push(channel);
    }
    sql += " ORDER BY o.date DESC";
    res.json(await db.prepare(sql).all(...params));
  });

  router.get("/:id", async (req, res) => {
    const order = await db
      .prepare(
        `SELECT o.*, c.name AS "customerName", e.name AS "employeeName"
         FROM orders o
         LEFT JOIN customers c ON c.id = o.customer_id
         LEFT JOIN employees e ON e.id = o.employee_id WHERE o.id = ?`
      )
      .get(req.params.id);
    if (!order) return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
    const items = await db
      .prepare(
        `SELECT oi.*, p.name AS "productName" FROM order_items oi
         JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`
      )
      .all(req.params.id);
    res.json({ ...order, items });
  });

  router.post("/", async (req, res) => {
    const { customerId, employeeId, items, paymentStatus, note } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Đơn hàng cần ít nhất một sản phẩm" });
    }
    const channel = defaultChannel || req.body.channel || "store";
    const total = items.reduce((sum, it) => sum + it.qty * it.price, 0);
    const code = `HD${String(Date.now()).slice(-8)}`;
    const now = new Date().toISOString();
    const status = paymentStatus === "unpaid" ? "unpaid" : "paid";

    const orderResult = await db
      .prepare(
        `INSERT INTO orders (code, customer_id, employee_id, channel, date, status, payment_status, total_amount, note)
         VALUES (?, ?, ?, ?, ?, 'completed', ?, ?, ?) RETURNING id`
      )
      .run(code, customerId || null, employeeId || null, channel, now, status, total, note || null);
    const orderId = orderResult.lastInsertRowid;

    for (const it of items) {
      const product = await db.prepare("SELECT cost FROM products WHERE id = ?").get(it.productId);
      await db
        .prepare("INSERT INTO order_items (order_id, product_id, qty, price, cost) VALUES (?, ?, ?, ?, ?)")
        .run(orderId, it.productId, it.qty, it.price, product?.cost ?? 0);
      await db.prepare("UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?").run(it.qty, it.productId);
    }

    if (status === "unpaid" && customerId) {
      await db.prepare("UPDATE customers SET debt_amount = debt_amount + ? WHERE id = ?").run(total, customerId);
    }

    const employee = employeeId ? await db.prepare("SELECT name FROM employees WHERE id = ?").get(employeeId) : null;
    await logActivity(
      "order",
      `${employee?.name || "Người dùng"} vừa bán đơn hàng với giá trị ${total.toLocaleString("vi-VN")}`,
      "order",
      orderId
    );

    res.status(201).json(await db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId));
  });

  router.put("/:id/status", async (req, res) => {
    const { status } = req.body || {};
    await db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json(await db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id));
  });

  router.post("/:id/return", async (req, res) => {
    const order = await db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
    if (!order) return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
    if (order.status === "returned") {
      return res.status(400).json({ error: "Đơn hàng này đã được trả trước đó" });
    }

    const items = await db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id);
    for (const it of items) {
      await db.prepare("UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?").run(it.qty, it.product_id);
    }

    if (order.payment_status === "unpaid" && order.customer_id) {
      await db
        .prepare("UPDATE customers SET debt_amount = GREATEST(debt_amount - ?, 0) WHERE id = ?")
        .run(order.total_amount, order.customer_id);
    } else if (order.payment_status === "paid" && order.total_amount > 0) {
      await db
        .prepare(
          "INSERT INTO cashbook_transactions (type, amount, date, description, category, method) VALUES ('out', ?, ?, ?, 'refund', 'cash')"
        )
        .run(order.total_amount, new Date().toISOString(), `Hoàn tiền trả hàng đơn ${order.code}`);
    }

    const now = new Date().toISOString();
    await db.prepare("UPDATE orders SET status = 'returned', returned_at = ? WHERE id = ?").run(now, order.id);

    const employee = order.employee_id ? await db.prepare("SELECT name FROM employees WHERE id = ?").get(order.employee_id) : null;
    await logActivity(
      "return",
      `${employee?.name || "Người dùng"} vừa trả hàng đơn ${order.code} trị giá ${order.total_amount.toLocaleString("vi-VN")}`,
      "order",
      order.id,
      now
    );

    res.json(await db.prepare("SELECT * FROM orders WHERE id = ?").get(order.id));
  });

  return router;
}

export default buildOrdersRouter();
