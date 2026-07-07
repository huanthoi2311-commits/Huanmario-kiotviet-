import { Router } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { JWT_SECRET, requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Thiếu tên đăng nhập hoặc mật khẩu" });
  }
  const user = await db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: "Sai tên đăng nhập hoặc mật khẩu" });
  }
  const token = jwt.sign(
    { id: user.id, username: user.username, fullName: user.full_name, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
  res.json({ token, user: { id: user.id, username: user.username, fullName: user.full_name, role: user.role } });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.put("/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Thiếu mật khẩu hiện tại hoặc mật khẩu mới" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Mật khẩu mới phải có ít nhất 6 ký tự" });
  }
  const user = await db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user || !verifyPassword(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: "Mật khẩu hiện tại không đúng" });
  }
  await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(newPassword), user.id);
  res.json({ ok: true });
});

export default router;
