import { Router } from "express";
import { db } from "../db.js";

const router = Router();

function rangeParams(req) {
  const end = req.query.end ? new Date(req.query.end) : new Date();
  const start = req.query.start
    ? new Date(req.query.start)
    : new Date(end.getFullYear(), end.getMonth() - 1, end.getDate());
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

router.get("/revenue", (req, res) => {
  const { start, end } = rangeParams(req);
  const rows = db
    .prepare(
      `SELECT date(date) AS day, COALESCE(SUM(total_amount), 0) AS revenue, COUNT(*) AS orders
       FROM orders WHERE date >= ? AND date <= ? AND status = 'completed'
       GROUP BY day ORDER BY day`
    )
    .all(start, end);
  const totals = db
    .prepare(
      `SELECT COALESCE(SUM(total_amount), 0) AS revenue, COUNT(*) AS orders
       FROM orders WHERE date >= ? AND date <= ? AND status = 'completed'`
    )
    .get(start, end);
  res.json({ rows, totals });
});

router.get("/top-products", (req, res) => {
  const { start, end } = rangeParams(req);
  const limit = Number(req.query.limit) || 10;
  const rows = db
    .prepare(
      `SELECT p.id, p.name, SUM(oi.qty) AS qty, SUM(oi.qty * oi.price) AS revenue
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       JOIN orders o ON o.id = oi.order_id
       WHERE o.date >= ? AND o.date <= ? AND o.status = 'completed'
       GROUP BY p.id ORDER BY revenue DESC LIMIT ?`
    )
    .all(start, end, limit);
  res.json(rows);
});

router.get("/top-customers", (req, res) => {
  const { start, end } = rangeParams(req);
  const limit = Number(req.query.limit) || 10;
  const rows = db
    .prepare(
      `SELECT c.id, c.name, COUNT(o.id) AS orderCount, SUM(o.total_amount) AS spend
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE o.date >= ? AND o.date <= ? AND o.status = 'completed'
       GROUP BY c.id ORDER BY spend DESC LIMIT ?`
    )
    .all(start, end, limit);
  res.json(rows);
});

export default router;
