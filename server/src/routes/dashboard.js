import { Router } from "express";
import { db } from "../db.js";

const router = Router();

function monthBounds(offsetMonths = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

router.get("/summary", (req, res) => {
  const todayRow = db
    .prepare(
      `SELECT COALESCE(SUM(total_amount), 0) AS revenue, COUNT(*) AS orders
       FROM orders WHERE date(date) = date('now') AND status = 'completed'`
    )
    .get();

  const thisMonth = monthBounds(0);
  const lastMonth = monthBounds(-1);

  const thisMonthRevenue = db
    .prepare(
      `SELECT COALESCE(SUM(total_amount), 0) AS revenue FROM orders
       WHERE date >= ? AND date < ? AND status = 'completed'`
    )
    .get(thisMonth.start, thisMonth.end).revenue;

  const lastMonthRevenue = db
    .prepare(
      `SELECT COALESCE(SUM(total_amount), 0) AS revenue FROM orders
       WHERE date >= ? AND date < ? AND status = 'completed'`
    )
    .get(lastMonth.start, lastMonth.end).revenue;

  const returns = db.prepare(`SELECT COUNT(*) AS c FROM orders WHERE status = 'returned'`).get().c;

  const percentChange =
    lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

  res.json({
    todayRevenue: todayRow.revenue,
    todayOrders: todayRow.orders,
    returns,
    netRevenueThisMonth: thisMonthRevenue,
    percentChangeVsLastMonth: Math.round(percentChange * 100) / 100,
  });
});

router.get("/revenue", (req, res) => {
  const groupBy = req.query.groupBy || "day";
  const { start, end } = monthBounds(0);

  if (groupBy === "hour") {
    const dateParam = req.query.date || new Date().toISOString().slice(0, 10);
    const rows = db
      .prepare(
        `SELECT strftime('%H', date) AS bucket, COALESCE(SUM(total_amount), 0) AS revenue
         FROM orders WHERE date(date) = ? AND status = 'completed'
         GROUP BY bucket ORDER BY bucket`
      )
      .all(dateParam);
    return res.json(rows.map((r) => ({ label: `${r.bucket}h`, revenue: r.revenue })));
  }

  if (groupBy === "weekday") {
    const rows = db
      .prepare(
        `SELECT strftime('%w', date) AS bucket, COALESCE(SUM(total_amount), 0) AS revenue
         FROM orders WHERE date >= ? AND date < ? AND status = 'completed'
         GROUP BY bucket ORDER BY bucket`
      )
      .all(start, end);
    const names = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    return res.json(rows.map((r) => ({ label: names[Number(r.bucket)], revenue: r.revenue })));
  }

  const rows = db
    .prepare(
      `SELECT strftime('%d', date) AS bucket, COALESCE(SUM(total_amount), 0) AS revenue
       FROM orders WHERE date >= ? AND date < ? AND status = 'completed'
       GROUP BY bucket ORDER BY bucket`
    )
    .all(start, end);
  res.json(rows.map((r) => ({ label: r.bucket, revenue: r.revenue })));
});

router.get("/top-products", (req, res) => {
  const limit = Number(req.query.limit) || 10;
  const rows = db
    .prepare(
      `SELECT p.id, p.name, SUM(oi.qty) AS qty, SUM(oi.qty * oi.price) AS revenue
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status = 'completed'
       GROUP BY p.id ORDER BY qty DESC LIMIT ?`
    )
    .all(limit);
  res.json(rows);
});

router.get("/top-customers", (req, res) => {
  const limit = Number(req.query.limit) || 10;
  const rows = db
    .prepare(
      `SELECT c.id, c.name, COUNT(o.id) AS orderCount, SUM(o.total_amount) AS spend
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE o.status = 'completed'
       GROUP BY c.id ORDER BY spend DESC LIMIT ?`
    )
    .all(limit);
  res.json(rows);
});

router.get("/activity", (req, res) => {
  const limit = Number(req.query.limit) || 10;
  const rows = db
    .prepare(`SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?`)
    .all(limit);
  res.json(rows);
});

router.get("/debtors", (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, name, debt_amount,
       CAST(julianday('now') - julianday(created_at) AS INTEGER) AS daysSince
       FROM customers WHERE debt_amount > 0 ORDER BY debt_amount DESC`
    )
    .all();
  res.json(rows);
});

export default router;
