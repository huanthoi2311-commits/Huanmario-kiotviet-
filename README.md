# Quản Lý Bán Hàng

Ứng dụng quản lý bán hàng tương tự KiotViet (Tổng quan, Hàng hóa, Mua hàng, Đơn hàng, Khách hàng, Nhân viên, Sổ quỹ, Báo cáo, Bán online, Thuế & Kế toán).

## Chạy ở máy local (dev)

```
cd server && npm install && npm run dev
cd client && npm install && npm run dev
```

Mở http://localhost:5173, đăng nhập `admin` / `admin123`.

## Build & chạy bản production (1 service)

```
cd client && npm install && npm run build
cd ../server && npm install --omit=dev && npm start
```

Mở http://localhost:4000 — server tự phục vụ luôn giao diện đã build.

## Deploy lên Fly.io

```
fly auth login
fly apps create <ten-app-cua-ban>
fly volumes create data --size 1 --region sin
fly secrets set JWT_SECRET=<chuoi-ngau-nhien-dai>
fly deploy
```

Sau khi deploy, web chạy tại `https://<ten-app-cua-ban>.fly.dev`.

## Đổi mật khẩu admin

Hiện tài khoản mặc định là `admin` / `admin123` (được seed sẵn trong `server/src/db.js`). Cách đổi:
1. Xóa dòng seed user hiện tại trong `db.js`, thay bằng mật khẩu mới, sau đó xóa file `server/data/app.db` và khởi động lại (sẽ seed lại toàn bộ dữ liệu — chỉ nên làm khi mới deploy, chưa có dữ liệu thật).
2. Hoặc thêm 1 trang "Đổi mật khẩu" gọi API cập nhật `password_hash` trong bảng `users` (chưa có trong bản hiện tại, có thể yêu cầu bổ sung).
