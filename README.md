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

Tài khoản mặc định khi seed lần đầu là `admin` / `admin123`. Sau khi đăng nhập, bấm nút **"Đổi mật khẩu"** ở góc trên bên phải để tự đặt mật khẩu mới (yêu cầu nhập đúng mật khẩu hiện tại, mật khẩu mới tối thiểu 6 ký tự). Nên đổi ngay trước khi deploy công khai.
