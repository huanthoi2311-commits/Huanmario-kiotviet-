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
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div>
      <header className="app-header">
        <div className="logo">🟦 QuảnLý Bán Hàng</div>
        <div className="header-right">
          <span className="header-icon" title="Giao hàng">
            🚚 Giao hàng<span className="header-icon-dot" />
          </span>
          <span className="header-icon" title="Chủ đề">🎨 Chủ đề</span>
          <span className="header-icon" title="Hỗ trợ">🎧 Hỗ trợ</span>
          <span className="header-icon" title="Góp ý">💬 Góp ý</span>
          <span className="header-icon" title="Ngôn ngữ">🇻🇳 Tiếng Việt ▾</span>
          <span className="header-icon header-icon-solo" title="Thông báo">🔔</span>
          <span className="header-icon header-icon-solo" title="Cài đặt">⚙️</span>

          <div className="user-menu">
            <button className="user-chip" onClick={() => setMenuOpen((v) => !v)}>
              👤 {user?.fullName} ▾
            </button>
            {menuOpen && (
              <div className="user-menu-dropdown">
                <button
                  onClick={() => {
                    setPasswordModalOpen(true);
                    setMenuOpen(false);
                  }}
                >
                  Đổi mật khẩu
                </button>
                <button onClick={logout}>Đăng xuất</button>
              </div>
            )}
          </div>
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
