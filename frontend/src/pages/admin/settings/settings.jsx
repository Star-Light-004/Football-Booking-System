import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./settings.css";

const navLinks = [
  { icon: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
  { icon: 'stadium', label: 'Fields', path: '/admin/fields' },
  { icon: 'event_available', label: 'Bookings', path: '/admin/bookings' },
  { icon: 'group', label: 'Users', path: '/admin/users' },
  { icon: 'payments', label: 'Revenue', path: '/admin/revenue' },
  { icon: 'calendar_month', label: 'Time Slots', path: '/admin/timeslots' },
  { icon: 'inventory_2', label: 'Services', path: '/admin/services' },
  { icon: 'settings', label: 'Settings', path: '/admin/settings' },
];

function Sidebar() {
  const location = useLocation();
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>Pitch &amp; Pulse</h1>
        <p>Admin Console</p>
      </div>

      <nav className="sidebar-nav">
        {navLinks.map(({ icon, label, path }) => (
          <Link
            key={label}
            to={path}
            className={`nav-link ${location.pathname === path ? "active" : ""}`}
          >
            <span className="material-symbols-outlined">{icon}</span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-profile">
        <div className="sidebar-profile-inner">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBbtTOzZUEspcIZtP_NrcVT_RpRIsxBXVtIHw8I_z9TgtDhtU851BPV7SC_PG4zamnMZ0emALIOpJfCvL4MfAfXJLhkDRRdQcH6A_UDRc5BrAhVSENkXZ9XrrsdW2tWheVauhO0S_7K-mN-e1Pi0zlx4fQSvAsYLRqw3gc2HLoB28R5Uyr5amlw666kMQbXZKr4W9xFKHYwHyKACWk7PPyUZp11_PnL1gqkvBWKJ76lcQn3HNAOO689oZ25n_R9O-JmkV3Rp_g1qao"
            alt="Admin"
          />
          <div>
            <p className="profile-name">Admin Panel</p>
            <p className="profile-role">Super Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopHeader() {
  return (
    <header className="top-header">
      <div className="search-box">
        <span className="material-symbols-outlined search-icon">search</span>
        <input type="text" placeholder="Tìm kiếm cài đặt..." />
      </div>

      <div className="header-actions">
        <button className="icon-btn">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="icon-btn">
          <span className="material-symbols-outlined">help_outline</span>
        </button>
      </div>
    </header>
  );
}

export default function AdminSettings() {
  return (
    <>
      <Sidebar />
      <TopHeader />

      <main className="main-content">
        <div className="content-inner">
          <div className="page-header">
            <div>
              <h2>Cài đặt hệ thống</h2>
              <p>Quản lý cấu hình chung, thông báo và bảo mật của hệ thống sân bóng.</p>
            </div>
          </div>

          <div className="settings-grid">
            <div className="settings-card">
              <div className="settings-card-header">
                <span className="material-symbols-outlined icon">tune</span>
                <h3>Cấu hình chung</h3>
              </div>
              <div className="settings-form">
                <div className="form-group">
                  <label>Tên hệ thống</label>
                  <input type="text" defaultValue="Pitch & Pulse Football" className="settings-input" />
                </div>
                <div className="form-group">
                  <label>Số điện thoại hỗ trợ hotline</label>
                  <input type="text" defaultValue="0988 123 456" className="settings-input" />
                </div>
                <div className="form-group">
                  <label>Email liên hệ</label>
                  <input type="email" defaultValue="support@pitchpulse.vn" className="settings-input" />
                </div>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-card-header">
                <span className="material-symbols-outlined icon">notifications_active</span>
                <h3>Cài đặt thông báo</h3>
              </div>
              <div className="settings-form">
                <label className="toggle-label">
                  <span>Gửi SMS xác nhận khi đặt sân thành công</span>
                  <input type="checkbox" defaultChecked />
                </label>
                <label className="toggle-label">
                  <span>Gửi Email thông báo đơn đặt sân mới cho Admin</span>
                  <input type="checkbox" defaultChecked />
                </label>
                <label className="toggle-label">
                  <span>Tự động nhắc lịch đá trước 2 giờ</span>
                  <input type="checkbox" defaultChecked />
                </label>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
