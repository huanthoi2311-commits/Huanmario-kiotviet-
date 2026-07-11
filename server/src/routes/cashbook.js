import { Router } from "express";
import { db } from "../db.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const rows = await db.prepare("SELECT * FROM cashbook_transactions ORDER BY date DESC").all();
    let balance = 0;
    const withBalance = [...rows].reverse().map((r) => {
      balance += r.type === "in" ? r.amount : -r.amount;
      return { ...r, runningBalance: balance };
    });
    res.json(withBalance.reverse());
  })
);

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const totals = await db
      .prepare(
        `SELECT
        COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END), 0) AS "totalIn",
        COALESCE(SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END), 0) AS "totalOut"
       FROM cashbook_transactions`
      )
      .get();
    res.json({ ...totals, balance: totals.totalIn - totals.totalOut });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { type, amount, description, category, method } = req.body || {};
    if (!type || !amount) return res.status(400).json({ error: "Thiếu loại phiếu hoặc số tiền" });
    const now = new Date().toISOString();
    const result = await db
      .prepare(
        "INSERT INTO cashbook_transactions (type, amount, date, description, category, method) VALUES (?, ?, ?, ?, ?, ?) RETURNING id"
      )
      .run(type, amount, now, description || null, category || null, method || "cash");
    res.status(201).json(await db.prepare("SELECT * FROM cashbook_transactions WHERE id = ?").get(result.lastInsertRowid));
  })
);

export default router;
