import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { hashPassword } from "./utils/password.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, "app.db"));

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin'
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  unit TEXT NOT NULL DEFAULT 'Cái',
  price REAL NOT NULL DEFAULT 0,
  cost REAL NOT NULL DEFAULT 0,
  stock_qty INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT
);

CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  supplier_id INTEGER REFERENCES suppliers(id),
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  total_amount REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id INTEGER NOT NULL REFERENCES purchases(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty INTEGER NOT NULL,
  price REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  debt_amount REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  hired_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  customer_id INTEGER REFERENCES customers(id),
  employee_id INTEGER REFERENCES employees(id),
  channel TEXT NOT NULL DEFAULT 'store',
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  payment_status TEXT NOT NULL DEFAULT 'paid',
  total_amount REAL NOT NULL DEFAULT 0,
  note TEXT
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty INTEGER NOT NULL,
  price REAL NOT NULL,
  cost REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cashbook_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  description TEXT,
  category TEXT,
  method TEXT NOT NULL DEFAULT 'cash'
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  ref_type TEXT,
  ref_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

const orderItemColumns = db.prepare("PRAGMA table_info(order_items)").all();
if (!orderItemColumns.some((c) => c.name === "cost")) {
  db.exec("ALTER TABLE order_items ADD COLUMN cost REAL NOT NULL DEFAULT 0");
  db.exec(
    `UPDATE order_items SET cost = COALESCE(
      (SELECT cost FROM products WHERE products.id = order_items.product_id), 0
    )`
  );
}

export function logActivity(type, message, refType = null, refId = null, createdAt = null) {
  db.prepare(
    `INSERT INTO activity_log (type, message, ref_type, ref_id, created_at) VALUES (?, ?, ?, ?, COALESCE(?, datetime('now')))`
  ).run(type, message, refType, refId, createdAt);
}

function seedIfEmpty() {
  const userCount = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  if (userCount > 0) return;

  db.prepare(
    "INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)"
  ).run("admin", hashPassword("admin123"), "Sika Đức An", "admin");

  const categoryNames = ["Vật liệu chống thấm", "Keo dán gạch", "Sơn & bả", "Dụng cụ thi công", "Phụ kiện"];
  const categoryIds = categoryNames.map(
    (name) => db.prepare("INSERT INTO categories (name) VALUES (?)").run(name).lastInsertRowid
  );

  const productDefs = [
    ["Màng PE 0.8 x 1.2 x 50 (Mét)", "PE-0812-50", 0, "Cuộn", 320000, 240000, 150],
    ["Sika Latex TH", "SIKA-LTX", 0, "Lít", 95000, 68000, 200],
    ["Sikatop Seal 107", "SIKA-107", 0, "Bộ", 780000, 600000, 60],
    ["Keo dán gạch Sika Ceram", "SIKA-CERAM", 1, "Bao", 145000, 105000, 120],
    ["Sơn chống thấm Kova CT-11A", "KOVA-CT11A", 2, "Thùng", 850000, 650000, 40],
    ["Bả Matit nội thất", "MATIT-NT", 2, "Bao", 120000, 90000, 90],
    ["Bay thi công inox", "DC-BAY01", 3, "Cái", 45000, 28000, 80],
    ["Máy khuấy sơn cầm tay", "DC-MK01", 3, "Cái", 650000, 480000, 15],
    ["Băng keo lưới chống nứt", "PK-BK01", 4, "Cuộn", 35000, 22000, 200],
    ["Ke góc chống thấm", "PK-KG01", 4, "Cái", 15000, 9000, 300],
  ];
  const productIds = productDefs.map((p) =>
    Number(
      db
        .prepare(
          "INSERT INTO products (name, sku, category_id, unit, price, cost, stock_qty) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run(p[0], p[1], categoryIds[p[2]], p[3], p[4], p[5], p[6]).lastInsertRowid
    )
  );

  const supplierDefs = [
    ["Công ty TNHH Sika Việt Nam", "0281234567", "KCN Sóng Thần, Bình Dương"],
    ["Công ty CP Sơn Kova", "0287654321", "Q. Bình Tân, TP.HCM"],
    ["Nhà phân phối VLXD Miền Nam", "0909111222", "Q. Thủ Đức, TP.HCM"],
  ];
  const supplierIds = supplierDefs.map(
    (s) => db.prepare("INSERT INTO suppliers (name, phone, address) VALUES (?, ?, ?)").run(...s).lastInsertRowid
  );

  const customerDefs = [
    ["Anh Tuấn chống thấm", "0912345678", "tuan.ct@gmail.com", "Q.9, TP.HCM", 4500000],
    ["Chị Lan xây dựng", "0923456789", "lan.xd@gmail.com", "Thủ Đức, TP.HCM", 5500000],
    ["Công ty XD Hoàng Gia", "0934567890", "hoanggia@gmail.com", "Biên Hòa, Đồng Nai", 0],
    ["Anh Phong thầu thợ", "0945678901", "phong.tho@gmail.com", "Q.2, TP.HCM", 0],
    ["Chị Hương vật liệu", "0956789012", "huong.vl@gmail.com", "Dĩ An, Bình Dương", 0],
    ["Anh Kiên sửa nhà", "0967890123", "kien.sn@gmail.com", "Q.7, TP.HCM", 0],
  ];
  const customerIds = customerDefs.map(
    (c) =>
      db
        .prepare(
          "INSERT INTO customers (name, phone, email, address, debt_amount) VALUES (?, ?, ?, ?, ?)"
        )
        .run(...c).lastInsertRowid
  );

  const employeeDefs = [
    ["Sika Đức An", "Quản lý", "0901111111", "ducan@sika.vn"],
    ["Nguyễn Văn Bình", "Nhân viên bán hàng", "0902222222", "binh@sika.vn"],
    ["Trần Thị Cúc", "Thu ngân", "0903333333", "cuc@sika.vn"],
  ];
  const employeeIds = employeeDefs.map(
    (e) =>
      db
        .prepare("INSERT INTO employees (name, role, phone, email) VALUES (?, ?, ?, ?)")
        .run(...e).lastInsertRowid
  );

  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (arr) => arr[rand(0, arr.length - 1)];

  const now = new Date();
  let orderCounter = 1;
  let purchaseCounter = 1;

  for (let dayOffset = 40; dayOffset >= 0; dayOffset--) {
    const day = new Date(now);
    day.setDate(day.getDate() - dayOffset);
    const ordersToday = dayOffset === 0 ? 2 : rand(0, 6);

    const maxHourToday = dayOffset === 0 ? Math.max(8, now.getHours()) : 19;

    for (let i = 0; i < ordersToday; i++) {
      const hour = rand(8, Math.min(19, maxHourToday));
      const orderDate = new Date(day);
      const minute = dayOffset === 0 && hour === now.getHours() ? rand(0, now.getMinutes()) : rand(0, 59);
      orderDate.setHours(hour, minute, 0, 0);
      const channel = Math.random() < 0.25 ? "online" : "store";
      const employeeId = pick(employeeIds);
      const customerId = Math.random() < 0.85 ? pick(customerIds) : null;

      const itemCount = rand(1, 3);
      let total = 0;
      const items = [];
      for (let j = 0; j < itemCount; j++) {
        const productIdx = rand(0, productDefs.length - 1);
        const qty = rand(1, 5);
        const price = productDefs[productIdx][4];
        const cost = productDefs[productIdx][5];
        total += qty * price;
        items.push({ productId: productIds[productIdx], qty, price, cost });
      }
      const paymentStatus = Math.random() < 0.1 ? "unpaid" : "paid";
      const code = `HD${String(orderCounter).padStart(6, "0")}`;
      orderCounter++;
      const isoDate = orderDate.toISOString();

      const orderId = db
        .prepare(
          `INSERT INTO orders (code, customer_id, employee_id, channel, date, status, payment_status, total_amount)
           VALUES (?, ?, ?, ?, ?, 'completed', ?, ?)`
        )
        .run(code, customerId, employeeId, channel, isoDate, paymentStatus, total).lastInsertRowid;

      for (const it of items) {
        db.prepare(
          "INSERT INTO order_items (order_id, product_id, qty, price, cost) VALUES (?, ?, ?, ?, ?)"
        ).run(orderId, it.productId, it.qty, it.price, it.cost);
      }

      const employeeName = employeeDefs.find((_, idx) => employeeIds[idx] === employeeId)[0];
      logActivity(
        "order",
        `${employeeName} vừa bán đơn hàng với giá trị ${total.toLocaleString("vi-VN")}`,
        "order",
        orderId,
        isoDate
      );
    }

    if (dayOffset > 0 && Math.random() < 0.15) {
      const supplierId = pick(supplierIds);
      const purchaseDate = new Date(day);
      purchaseDate.setHours(rand(8, 17), 0, 0, 0);
      const itemCount = rand(1, 4);
      let total = 0;
      const items = [];
      for (let j = 0; j < itemCount; j++) {
        const productIdx = rand(0, productDefs.length - 1);
        const qty = rand(10, 60);
        const price = productDefs[productIdx][5];
        total += qty * price;
        items.push({ productId: productIds[productIdx], qty, price });
      }
      const code = `PN${String(purchaseCounter).padStart(6, "0")}`;
      purchaseCounter++;
      const isoDate = purchaseDate.toISOString();
      const purchaseId = db
        .prepare(
          "INSERT INTO purchases (code, supplier_id, date, status, total_amount) VALUES (?, ?, ?, 'completed', ?)"
        )
        .run(code, supplierId, isoDate, total).lastInsertRowid;
      for (const it of items) {
        db.prepare(
          "INSERT INTO purchase_items (purchase_id, product_id, qty, price) VALUES (?, ?, ?, ?)"
        ).run(purchaseId, it.productId, it.qty, it.price);
        db.prepare("UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?").run(it.qty, it.productId);
      }
      logActivity(
        "purchase",
        `Sika Đức An vừa nhập hàng với giá trị ${total.toLocaleString("vi-VN")}`,
        "purchase",
        purchaseId,
        isoDate
      );
    }

    if (dayOffset > 0 && Math.random() < 0.4) {
      const isIn = Math.random() < 0.6;
      const amount = rand(200000, 3000000);
      const cashDate = new Date(day);
      cashDate.setHours(rand(8, 18), 0, 0, 0);
      db.prepare(
        "INSERT INTO cashbook_transactions (type, amount, date, description, category, method) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(
        isIn ? "in" : "out",
        amount,
        cashDate.toISOString(),
        isIn ? "Thu tiền bán hàng" : "Chi phí vận hành cửa hàng",
        isIn ? "sales" : "operating",
        Math.random() < 0.5 ? "cash" : "bank"
      );
    }
  }

  logActivity("inventory", "Sika Đức An vừa thực hiện kiểm hàng", null, null, new Date(now.getTime() - 2 * 86400000).toISOString());

  const debtCustomers = db.prepare("SELECT id FROM customers WHERE debt_amount > 0").all();
  for (const c of debtCustomers) {
    db.prepare("UPDATE customers SET created_at = ? WHERE id = ?").run(
      new Date(now.getTime() - 15 * 86400000).toISOString(),
      c.id
    );
  }
}

seedIfEmpty();
