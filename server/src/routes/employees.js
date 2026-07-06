import { Router } from "express";
import { db } from "../db.js";

const router = Router();

router.get("/", (req, res) => {
  res.json(db.prepare("SELECT * FROM employees ORDER BY id DESC").all());
});

router.get("/:id", (req, res) => {
  const employee = db.prepare("SELECT * FROM employees WHERE id = ?").get(req.params.id);
  if (!employee) return res.status(404).json({ error: "Không tìm thấy nhân viên" });
  res.json(employee);
});

router.post("/", (req, res) => {
  const { name, role, phone, email } = req.body || {};
  if (!name || !role) return res.status(400).json({ error: "Thiếu tên hoặc chức vụ" });
  const result = db
    .prepare("INSERT INTO employees (name, role, phone, email) VALUES (?, ?, ?, ?)")
    .run(name, role, phone || null, email || null);
  res.status(201).json(db.prepare("SELECT * FROM employees WHERE id = ?").get(result.lastInsertRowid));
});

router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM employees WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Không tìm thấy nhân viên" });
  const { name, role, phone, email } = req.body || {};
  db.prepare("UPDATE employees SET name = ?, role = ?, phone = ?, email = ? WHERE id = ?").run(
    name ?? existing.name,
    role ?? existing.role,
    phone ?? existing.phone,
    email ?? existing.email,
    req.params.id
  );
  res.json(db.prepare("SELECT * FROM employees WHERE id = ?").get(req.params.id));
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM employees WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

export default router;
