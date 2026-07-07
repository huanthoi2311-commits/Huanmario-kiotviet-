# Quản Lý Bán Hàng

Ứng dụng quản lý bán hàng tương tự KiotViet (Tổng quan, Hàng hóa, Mua hàng, Đơn hàng, Khách hàng, Nhân viên, Sổ quỹ, Báo cáo, Bán online, Thuế & Kế toán).

Backend dùng PostgreSQL (Neon) — không còn phụ thuộc file SQLite cục bộ, nên chạy tốt trên nền tảng serverless như Vercel.

## Chạy ở máy local (dev)

Cần một biến môi trường `DATABASE_URL` trỏ tới PostgreSQL (Neon) và `JWT_SECRET`. Nếu project đã liên kết với Vercel:

```
vercel env pull .env.local
```

Sau đó:

```
cd server && npm install && npm run dev
cd client && npm install && npm run dev
```

Mở http://localhost:5173, đăng nhập `admin` / `admin123`. Lần chạy đầu tiên trên một database trống sẽ tự seed dữ liệu mẫu.

## Deploy lên Vercel

```
vercel link
vercel install neon        # cấp phát Postgres miễn phí, tự kết nối + tự set DATABASE_URL
vercel env add JWT_SECRET production
vercel env add JWT_SECRET preview
vercel env add JWT_SECRET development
vercel deploy --prod
```

`vercel.json` đã cấu hình build client (Vite) tĩnh + server Express chạy dạng serverless function, route `/api/*` vào server, các route còn lại fallback về `index.html` cho React Router.

## Deploy lên Fly.io (tùy chọn)

Vẫn hoạt động được nếu muốn dùng Fly.io thay vì Vercel — chỉ cần set cùng `DATABASE_URL`/`JWT_SECRET` làm secrets, không cần volume nữa vì dữ liệu đã ở Neon:

```
fly auth login
fly apps create <ten-app-cua-ban>
fly secrets set DATABASE_URL=<connection-string-tu-neon> JWT_SECRET=<chuoi-ngau-nhien-dai>
fly deploy
```

## Đổi mật khẩu admin

Tài khoản mặc định khi seed lần đầu là `admin` / `admin123`. Sau khi đăng nhập, bấm nút **"Đổi mật khẩu"** ở góc trên bên phải để tự đặt mật khẩu mới (yêu cầu nhập đúng mật khẩu hiện tại, mật khẩu mới tối thiểu 6 ký tự). Nên đổi ngay trước khi deploy công khai.
