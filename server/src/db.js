import { neon, types } from "@neondatabase/serverless";
import { hashPassword } from "./utils/password.js";

// COUNT(*)/SUM(int) come back as bigint (oid 20); parse as JS number since our
// values never approach the range where that would lose precision.
types.setTypeParser(20, (val) => parseInt(val, 10));

// Use the stateless HTTP query function rather than Pool: Pool keeps a
// WebSocket open, which goes stale across the freeze/thaw cycles of a
// serverless function and surfaces as random "ErrorEvent" failures on
// warm invocations. Every call here is a single independent HTTP request,
// which is what Neon recommends for serverless/edge runtimes.
const sql = neon(process.env.DATABASE_URL);

function toPositional(sqlText) {
  let i = 0;
  return sqlText.replace(/\?/g, () => `$${++i}`);
}

export const db = {
  prepare(sqlText) {
    const text = toPositional(sqlText);
    return {
      async get(...params) {
        const rows = await sql.query(text, params);
        return rows[0];
      },
      async all(...params) {
        return sql.query(text, params);
      },
      async run(...params) {
        const rows = await sql.query(text, params);
        return { lastInsertRowid: rows[0]?.id };
      },
    };
  },
};

// Bulk helpers: seeding hundreds of rows one INSERT at a time is far too slow
// over a network round trip per row (and would blow past a serverless
// function's execution time limit), so pack many rows into one statement.
async function bulkInsert(table, columns, rows, { returningIds = false } = {}) {
  if (rows.length === 0) return [];
  const placeholders = rows.map((row) => `(${row.map(() => "?").join(", ")})`).join(", ");
  const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders}${
    returningIds ? " RETURNING id" : ""
  }`;
  return db.prepare(sql).all(...rows.flat());
}

async function bulkAdjustStock(adjustments) {
  const entries = [...adjustments.entries()];
  if (entries.length === 0) return;
  const placeholders = entries.map(() => "(?::int, ?::int)").join(", ");
  const sql = `UPDATE products AS p SET stock_qty = p.stock_qty + v.qty
               FROM (VALUES ${placeholders}) AS v(id, qty)
               WHERE p.id = v.id`;
  await db.prepare(sql).run(...entries.flat());
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin'
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    unit TEXT NOT NULL DEFAULT 'Cái',
    price DOUBLE PRECISION NOT NULL DEFAULT 0,
    cost DOUBLE PRECISION NOT NULL DEFAULT 0,
    stock_qty INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    supplier_id INTEGER REFERENCES suppliers(id),
    date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    total_amount DOUBLE PRECISION NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS purchase_items (
    id SERIAL PRIMARY KEY,
    purchase_id INTEGER NOT NULL REFERENCES purchases(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    qty INTEGER NOT NULL,
    price DOUBLE PRECISION NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    debt_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    hired_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    employee_id INTEGER REFERENCES employees(id),
    channel TEXT NOT NULL DEFAULT 'store',
    date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    payment_status TEXT NOT NULL DEFAULT 'paid',
    total_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    note TEXT,
    returned_at TIMESTAMPTZ
  )`,
  `CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    qty INTEGER NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    cost DOUBLE PRECISION NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS cashbook_transactions (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    description TEXT,
    category TEXT,
    method TEXT NOT NULL DEFAULT 'cash'
  )`,
  `CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    ref_type TEXT,
    ref_id INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
];

async function ensureSchema() {
  for (const statement of SCHEMA_STATEMENTS) {
    await sql.query(statement);
  }
}

export async function logActivity(type, message, refType = null, refId = null, createdAt = null) {
  await db
    .prepare(
      `INSERT INTO activity_log (type, message, ref_type, ref_id, created_at) VALUES (?, ?, ?, ?, COALESCE(?, NOW()))`
    )
    .run(type, message, refType, refId, createdAt);
}

async function seedIfEmpty() {
  const userCount = (await db.prepare("SELECT COUNT(*) AS c FROM users").get()).c;
  if (userCount > 0) return;

  await db
    .prepare("INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)")
    .run("admin", hashPassword("admin123"), "Sika Đức An", "admin");

  const categoryNames = ["Vật liệu chống thấm", "Keo dán gạch", "Sơn & bả", "Dụng cụ thi công", "Phụ kiện"];
  const categoryRows = await bulkInsert("categories", ["name"], categoryNames.map((name) => [name]), {
    returningIds: true,
  });
  const categoryIds = categoryRows.map((r) => r.id);

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
  const productRows = await bulkInsert(
    "products",
    ["name", "sku", "category_id", "unit", "price", "cost", "stock_qty"],
    productDefs.map((p) => [p[0], p[1], categoryIds[p[2]], p[3], p[4], p[5], p[6]]),
    { returningIds: true }
  );
  const productIds = productRows.map((r) => r.id);

  const supplierDefs = [
    ["Công ty TNHH Sika Việt Nam", "0281234567", "KCN Sóng Thần, Bình Dương"],
    ["Công ty CP Sơn Kova", "0287654321", "Q. Bình Tân, TP.HCM"],
    ["Nhà phân phối VLXD Miền Nam", "0909111222", "Q. Thủ Đức, TP.HCM"],
  ];
  const supplierRows = await bulkInsert("suppliers", ["name", "phone", "address"], supplierDefs, {
    returningIds: true,
  });
  const supplierIds = supplierRows.map((r) => r.id);

  const customerDefs = [
    ["Anh Tuấn chống thấm", "0912345678", "tuan.ct@gmail.com", "Q.9, TP.HCM", 4500000],
    ["Chị Lan xây dựng", "0923456789", "lan.xd@gmail.com", "Thủ Đức, TP.HCM", 5500000],
    ["Công ty XD Hoàng Gia", "0934567890", "hoanggia@gmail.com", "Biên Hòa, Đồng Nai", 0],
    ["Anh Phong thầu thợ", "0945678901", "phong.tho@gmail.com", "Q.2, TP.HCM", 0],
    ["Chị Hương vật liệu", "0956789012", "huong.vl@gmail.com", "Dĩ An, Bình Dương", 0],
    ["Anh Kiên sửa nhà", "0967890123", "kien.sn@gmail.com", "Q.7, TP.HCM", 0],
  ];
  const customerRows = await bulkInsert(
    "customers",
    ["name", "phone", "email", "address", "debt_amount"],
    customerDefs,
    { returningIds: true }
  );
  const customerIds = customerRows.map((r) => r.id);

  const employeeDefs = [
    ["Sika Đức An", "Quản lý", "0901111111", "ducan@sika.vn"],
    ["Nguyễn Văn Bình", "Nhân viên bán hàng", "0902222222", "binh@sika.vn"],
    ["Trần Thị Cúc", "Thu ngân", "0903333333", "cuc@sika.vn"],
  ];
  const employeeRows = await bulkInsert("employees", ["name", "role", "phone", "email"], employeeDefs, {
    returningIds: true,
  });
  const employeeIds = employeeRows.map((r) => r.id);

  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (arr) => arr[rand(0, arr.length - 1)];

  const now = new Date();
  let orderCounter = 1;
  let purchaseCounter = 1;

  // Generate 41 days of plausible orders/purchases/cashbook activity in memory
  // first, then persist each table with a handful of bulk statements instead
  // of one round trip per row.
  const orderPlans = [];
  const purchasePlans = [];
  const cashbookRows = [];

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
      const employeeName = employeeDefs.find((_, idx) => employeeIds[idx] === employeeId)[0];

      orderPlans.push({
        code,
        customerId,
        employeeId,
        channel,
        date: orderDate.toISOString(),
        paymentStatus,
        total,
        items,
        employeeName,
      });
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
      purchasePlans.push({ code, supplierId, date: purchaseDate.toISOString(), total, items });
    }

    if (dayOffset > 0 && Math.random() < 0.4) {
      const isIn = Math.random() < 0.6;
      const amount = rand(200000, 3000000);
      const cashDate = new Date(day);
      cashDate.setHours(rand(8, 18), 0, 0, 0);
      cashbookRows.push([
        isIn ? "in" : "out",
        amount,
        cashDate.toISOString(),
        isIn ? "Thu tiền bán hàng" : "Chi phí vận hành cửa hàng",
        isIn ? "sales" : "operating",
        Math.random() < 0.5 ? "cash" : "bank",
      ]);
    }
  }

  const activityRows = [];

  // Orders + order_items
  const orderRows = await bulkInsert(
    "orders",
    ["code", "customer_id", "employee_id", "channel", "date", "status", "payment_status", "total_amount"],
    orderPlans.map((o) => [o.code, o.customerId, o.employeeId, o.channel, o.date, "completed", o.paymentStatus, o.total]),
    { returningIds: true }
  );
  const orderItemRows = [];
  orderPlans.forEach((o, idx) => {
    const orderId = orderRows[idx].id;
    for (const it of o.items) {
      orderItemRows.push([orderId, it.productId, it.qty, it.price, it.cost]);
    }
    activityRows.push([
      "order",
      `${o.employeeName} vừa bán đơn hàng với giá trị ${o.total.toLocaleString("vi-VN")}`,
      "order",
      orderId,
      o.date,
    ]);
  });
  await bulkInsert("order_items", ["order_id", "product_id", "qty", "price", "cost"], orderItemRows);

  // Purchases + purchase_items (+ stock replenishment)
  const purchaseRows = await bulkInsert(
    "purchases",
    ["code", "supplier_id", "date", "status", "total_amount"],
    purchasePlans.map((p) => [p.code, p.supplierId, p.date, "completed", p.total]),
    { returningIds: true }
  );
  const purchaseItemRows = [];
  const stockAdjustments = new Map();
  purchasePlans.forEach((p, idx) => {
    const purchaseId = purchaseRows[idx].id;
    for (const it of p.items) {
      purchaseItemRows.push([purchaseId, it.productId, it.qty, it.price]);
      stockAdjustments.set(it.productId, (stockAdjustments.get(it.productId) || 0) + it.qty);
    }
    activityRows.push([
      "purchase",
      `Sika Đức An vừa nhập hàng với giá trị ${p.total.toLocaleString("vi-VN")}`,
      "purchase",
      purchaseId,
      p.date,
    ]);
  });
  await bulkInsert("purchase_items", ["purchase_id", "product_id", "qty", "price"], purchaseItemRows);
  await bulkAdjustStock(stockAdjustments);

  // Cashbook
  await bulkInsert("cashbook_transactions", ["type", "amount", "date", "description", "category", "method"], cashbookRows);

  // Activity log (order/purchase activity plus a fixed inventory-check entry)
  activityRows.push([
    "inventory",
    "Sika Đức An vừa thực hiện kiểm hàng",
    null,
    null,
    new Date(now.getTime() - 2 * 86400000).toISOString(),
  ]);
  await bulkInsert("activity_log", ["type", "message", "ref_type", "ref_id", "created_at"], activityRows);

  await db
    .prepare("UPDATE customers SET created_at = ? WHERE debt_amount > 0")
    .run(new Date(now.getTime() - 15 * 86400000).toISOString());
}

// A rejected promise stays rejected forever, which would permanently break
// every future request on a warm serverless instance after one transient
// failure (e.g. a dropped connection). Reset on failure so the next request
// gets a fresh attempt instead of being stuck replaying the same error.
let readyPromise = null;
export function dbReady() {
  if (!readyPromise) {
    readyPromise = ensureSchema()
      .then(() => seedIfEmpty())
      .catch((err) => {
        readyPromise = null;
        throw err;
      });
  }
  return readyPromise;
}
