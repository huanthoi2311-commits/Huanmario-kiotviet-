import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ChangePasswordModal from "./ChangePasswordModal.jsx";

const NAV_ITEMS = [
  { to: "/", label: "Tổng quan", end: true },
  { to: "/products", label: "Hàng hóa" },
  { to: "/purchases", label: "Mua hàng" },
  { to: "/orders", label: "Đơn hàng" },
  { to: "/customers", label: "Khách hàng" },
  { to: "/employees", label: "Nhân viên" },
  { to: "/cashbook", label: "Sổ quỹ" },
  { to: "/reports", label: "Báo cáo" },
  { to: "/online-sales", label: "Bán online" },
  { to: "/tax", label: "Thuế & Kế toán" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  return (
    <div>
      <header className="app-header">
        <div className="logo">🟦 QuảnLý Bán Hàng</div>
        <div className="header-right">
          <span className="user-chip">👤 {user?.fullName}</span>
          <button className="logout-btn" onClick={() => setPasswordModalOpen(true)}>Đổi mật khẩu</button>
          <button className="logout-btn" onClick={logout}>Đăng xuất</button>
        </div>
      </header>
      {passwordModalOpen && <ChangePasswordModal onClose={() => setPasswordModalOpen(false)} />}
      <nav className="topnav">
        <div className="nav-links">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
              {item.label}
            </NavLink>
          ))}
        </div>
        <NavLink to="/orders" className="sell-btn">🛒 Bán hàng</NavLink>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
