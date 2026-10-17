import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { filterNavLinksByPermission } from "../../utils/permissionUtils";
import "./AdminSidebar.css";

// ── Nav links chung cho toàn bộ trang admin ──────────────────────────────────
export const ADMIN_NAV_LINKS = [
  { icon: "dashboard",       label: "Tổng quan",         path: "/admin/dashboard", permission: "dashboard" },
  { icon: "stadium",         label: "Quản lý sân bóng", path: "/admin/fields",    permission: "fields" },
  { icon: "event_available", label: "Quản lý đặt sân",  path: "/admin/bookings",  permission: "bookings" },
  {
    icon: "group",
    label: "Người dùng",
    path: "/admin/users",
    permission: "users",
    subMenu: [
      { label: "Tài khoản hệ thống", path: "/admin/users" },
      { label: "Khách vãng lai", path: "/admin/users?tab=guests" },
      { label: "Phân quyền", path: "/admin/users/roles" },
    ],
  },
  { icon: "payments",        label: "Doanh thu",        path: "/admin/revenue",   permission: "revenue" },
  { icon: "calendar_month",  label: "Khung giờ",        path: "/admin/timeslots", permission: "timeslots" },
  { icon: "inventory_2",           label: "Dịch vụ",          path: "/admin/services",  permission: "services" },
  {
    icon: "confirmation_number",
    label: "Quản lý voucher",
    path: "/admin/vouchers",
    permission: "vouchers",
    subMenu: [
      { label: "Chính sách voucher", path: "/admin/vouchers" },
      { label: "Lịch sử phát voucher", path: "/admin/vouchers?tab=history" },
    ],
  },
  { icon: "settings",              label: "Cài đặt",          path: "/admin/settings",  permission: "settings" },
];

const ROLE_LABELS = {
  admin:         "Quản trị viên",
  field_owner:   "Chủ sân",
  field_manager: "Quản lý sân",
  receptionist:  "Lễ tân",
  cashier:       "Thu ngân",
  cleaner:       "Vệ sinh",
  service_staff: "Nhân viên DV",
  maintenance:   "Kỹ thuật",
};

const AVATAR_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCN8B1_XgT-gyh6hViClDnURmdEgMriI9tLL5MirBkzBqNDwUjaetJrOYSkH7rBKA25sr4LDP9m5cJoj4D6NM_H_r1SlNQ8_MhW9rS_ehEYjU7bTXPFF5sEq0e8xVMpbvktPsKgkAMsGGieA3DhoaZGVvdvBXTmeuBFMgk4IhWhmxMknWIj3Mvk7w6yRnl6hMqbw2Ls8ufDqptzZeLNQ5wSEep5KZjz1FMQVz1O028ND-V_miwWbNAIB16XihsBLMcPSWYNV-6e0us";

/**
 * AdminSidebar — sidebar dùng chung cho tất cả trang admin.
 * Tự động đọc thông tin admin từ localStorage "admin_user".
 * Logout chỉ xóa "admin_user", KHÔNG ảnh hưởng session user trang chủ.
 */
function AdminSidebar() {
  const location = useLocation();
  const visibleLinks = filterNavLinksByPermission(ADMIN_NAV_LINKS);

  // Mặc định mở menu nếu đang ở trang con
  const isUsersRoute = location.pathname.startsWith("/admin/users");
  const isVouchersRoute = location.pathname.startsWith("/admin/vouchers");
  const [expandedMenu, setExpandedMenu] = useState(
    isUsersRoute ? "Người dùng" : (isVouchersRoute ? "Quản lý voucher" : "")
  );

  const toggleMenu = (label) => {
    setExpandedMenu((prev) => (prev === label ? "" : label));
  };

  // Lấy thông tin admin hiện tại
  const adminUser = (() => {
    try {
      const raw = localStorage.getItem("admin_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  // Logout admin — chỉ xóa "admin_user", giữ nguyên "user" của trang chủ
  const handleAdminLogout = () => {
    localStorage.removeItem("admin_user");
    window.location.href = "/login";
  };

  const displayName = adminUser?.full_name || adminUser?.fullname || adminUser?.phone || "Admin";
  const displayRole = ROLE_LABELS[adminUser?.role] || "Quản trị viên";

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>Pitch &amp; Pulse</h1>
        <p>QUẢN TRỊ SÂN CỎ</p>
      </div>

      <nav className="sidebar-nav">
        {visibleLinks.map(({ icon, label, path, subMenu }) => {
          const isActive = location.pathname === path;
          const isSubMenuActive = subMenu?.some((item) => location.pathname === item.path.split("?")[0]);
          const isExpanded = expandedMenu === label;

          return (
            <div key={label}>
              <Link
                to={path}
                className={`nav-link ${isActive || isSubMenuActive ? "active" : ""}`}
                onClick={() => {
                  if (subMenu) {
                    toggleMenu(label);
                  }
                }}
              >
                <span className="material-symbols-outlined">{icon}</span>
                <span>{label}</span>
                {subMenu && (
                  <span className={`material-symbols-outlined chevron ${isExpanded ? "expanded" : ""}`}>
                    expand_more
                  </span>
                )}
              </Link>
              {subMenu && isExpanded && (
                <div className="submenu">
                  {subMenu.map((item) => {
                    const fullCurrent = `${location.pathname}${location.search}`;
                    const isSubActive =
                      fullCurrent === item.path ||
                      (item.path === "/admin/users" &&
                        location.pathname === "/admin/users" &&
                        !location.search.includes("tab=guests")) ||
                      (item.path === "/admin/vouchers" &&
                        location.pathname === "/admin/vouchers" &&
                        !location.search.includes("tab=history"));
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`submenu-link ${isSubActive ? "active" : ""}`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-profile">
        <div className="sidebar-profile-inner" style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
          <img src={AVATAR_URL} alt="Admin" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="profile-name" title={displayName}>{displayName}</p>
            <p className="profile-role">{displayRole}</p>
          </div>
          <button
            onClick={handleAdminLogout}
            title="Đăng xuất khỏi trang quản trị"
            className="sidebar-profile-btn-logout"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#ef4444",
              padding: "4px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
              transition: "all 0.2s ease",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default AdminSidebar;
