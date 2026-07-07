import { Router } from "express";
import { db } from "../db.js";

const router = Router();

const PRESUMPTIVE_TAX_RATE = 0.015; // simplified placeholder, not a substitute for real accounting advice

router.get("/monthly-summary", (req, res) => {
  const months = Number(req.query.months) || 6;
  const rows = db
    .prepare(
      `SELECT strftime('%Y-%m', o.date) AS month,
              COALESCE(SUM(o.total_amount), 0) AS revenue,
              COALESCE(SUM(oi.qty * oi.cost), 0) AS cost
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.status = 'completed'
       GROUP BY month ORDER BY month DESC LIMIT ?`
    )
    .all(months);

  const summary = rows.map((r) => ({
    month: r.month,
    revenue: r.revenue,
    cost: r.cost,
    grossProfit: r.revenue - r.cost,
    estimatedTax: Math.round(r.revenue * PRESUMPTIVE_TAX_RATE),
  }));

  res.json({ taxRate: PRESUMPTIVE_TAX_RATE, months: summary.reverse() });
});

export default router;
