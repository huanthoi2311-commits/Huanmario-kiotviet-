import { Router } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { JWT_SECRET, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post(
  "/login",
  asyncHandler(async (req, res) => {
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

    const ip = (req.headers["x-forwarded-for"] || req.ip || "").toString().split(",")[0].trim() || null;
    const userAgent = req.headers["user-agent"] || null;
    const priorFromIp = ip
      ? (await db.prepare("SELECT COUNT(*) AS c FROM login_history WHERE user_id = ? AND ip_address = ?").get(user.id, ip)).c
      : 0;
    const hasAnyHistory = (await db.prepare("SELECT COUNT(*) AS c FROM login_history WHERE user_id = ?").get(user.id)).c > 0;
    const isUnusual = hasAnyHistory && priorFromIp === 0;
    await db
      .prepare("INSERT INTO login_history (user_id, ip_address, user_agent, is_unusual) VALUES (?, ?, ?, ?)")
      .run(user.id, ip, userAgent, isUnusual);

    res.json({ token, user: { id: user.id, username: user.username, fullName: user.full_name, role: user.role } });
  })
);

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.get(
  "/login-activity",
  requireAuth,
  asyncHandler(async (req, res) => {
    const items = await db
      .prepare(
        `SELECT id, ip_address, user_agent, created_at FROM login_history
         WHERE user_id = ? AND is_unusual = TRUE AND created_at > NOW() - INTERVAL '7 days'
         ORDER BY created_at DESC LIMIT 10`
      )
      .all(req.user.id);
    res.json({ count: items.length, items });
  })
);

router.put(
  "/password",
  requireAuth,
  asyncHandler(async (req, res) => {
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
  })
);

export default router;
