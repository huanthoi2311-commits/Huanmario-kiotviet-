import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import "./db.js";
import { requireAuth } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import productRoutes from "./routes/products.js";
import customerRoutes from "./routes/customers.js";
import employeeRoutes from "./routes/employees.js";
import purchaseRoutes from "./routes/purchases.js";
import orderRoutes from "./routes/orders.js";
import onlineSalesRoutes from "./routes/onlineSales.js";
import cashbookRoutes from "./routes/cashbook.js";
import reportRoutes from "./routes/reports.js";
import taxRoutes from "./routes/tax.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", requireAuth, dashboardRoutes);
app.use("/api/products", requireAuth, productRoutes);
app.use("/api/customers", requireAuth, customerRoutes);
app.use("/api/employees", requireAuth, employeeRoutes);
app.use("/api/purchases", requireAuth, purchaseRoutes);
app.use("/api/orders", requireAuth, orderRoutes);
app.use("/api/online-sales", requireAuth, onlineSalesRoutes);
app.use("/api/cashbook", requireAuth, cashbookRoutes);
app.use("/api/reports", requireAuth, reportRoutes);
app.use("/api/tax", requireAuth, taxRoutes);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "..", "..", "client", "dist");

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Lỗi máy chủ" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
