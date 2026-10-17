import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  getUsers,
  createUser,
  createGuestCustomer,
  updateUser,
  deleteUser,
  toggleUserStatus,
} from "../../../api/usersApi";

import "./users.css";
import { useToast, ToastContainer } from "../../../components/Toast/Toast";
import { hasPermission, getCurrentUser } from "../../../utils/permissionUtils";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";

/* ── Constants ── */
const ROLES = [
  { value: "customer", label: "Người dùng" },
  { value: "field_owner", label: "Chủ sân" },
  { value: "field_manager", label: "Người quản lý sân" },
  { value: "receptionist", label: "Lễ tân" },
  { value: "cashier", label: "Nhân viên thu ngân" },
  { value: "cleaner", label: "Nhân viên dọn dẹp" },
  { value: "service_staff", label: "Nhân viên dịch vụ" },
  { value: "maintenance", label: "Nhân viên bảo trì sân" },
  { value: "admin", label: "Quản trị viên" },
];

/* ── Sub-components ── */
function RoleBadge({ role }) {
  const map = {
    customer: { label: "Người dùng", cls: "role-badge customer" },
    field_owner: { label: "Chủ sân", cls: "role-badge field-owner" },
    field_manager: { label: "Người quản lý sân", cls: "role-badge field-manager" },
    receptionist: { label: "Lễ tân", cls: "role-badge receptionist" },
    cashier: { label: "Nhân viên thu ngân", cls: "role-badge cashier" },
    cleaner: { label: "Nhân viên dọn dẹp", cls: "role-badge cleaner" },
    service_staff: { label: "Nhân viên dịch vụ", cls: "role-badge service-staff" },
    maintenance: { label: "Nhân viên bảo trì sân", cls: "role-badge maintenance" },
    staff: { label: "Nhân viên", cls: "role-badge staff" },
    admin: { label: "Quản trị viên", cls: "role-badge admin" },
  };
  const info = map[role] || map["customer"];
  return <span className={info.cls}>{info.label}</span>;
}

function StatusBadge({ status }) {
  const isActive = status === "active";
  return (
    <span className={`status-indicator ${isActive ? "active" : "locked"}`}>
      <span className={`status-dot ${isActive ? "green" : "red"}`} />
      {isActive ? "Hoạt động" : "Bị khóa"}
    </span>
  );
}

function TopHeader({ searchQuery, onSearchChange, activeTab, onAddNew }) {
  return (
    <header className="top-header">
      <div className="search-box">
        <span className="material-symbols-outlined search-icon">search</span>
        <input
          type="text"
          placeholder={
            activeTab === "guests"
              ? "Tìm kiếm khách vãng lai..."
              : "Tìm kiếm tài khoản thành viên..."
          }
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="header-actions">
        <div className="icon-group">
          <button className="icon-btn">
            <span className="material-symbols-outlined">notifications</span>
            <span className="notif-dot" />
          </button>
          <button className="icon-btn">
            <span className="material-symbols-outlined">help_outline</span>
          </button>
        </div>
        <div className="header-divider" />
        <button
          className={activeTab === "guests" ? "btn-add-guest" : "btn-new-booking"}
          type="button"
          onClick={onAddNew}
        >
          <span className="material-symbols-outlined">
            {activeTab === "guests" ? "person_add" : "add"}
          </span>
          {activeTab === "guests" ? "Thêm khách vãng lai" : "Thêm người dùng"}
        </button>
      </div>
    </header>
  );
}

function StatsGrid({ stats, isGuestTab }) {
  const memberCards = [
    { label: "TỔNG THÀNH VIÊN", value: stats.total || 0, icon: "groups", tone: "blue", note: "Tài khoản đăng ký" },
    { label: "ĐANG HOẠT ĐỘNG", value: stats.active || 0, icon: "check_circle", tone: "green", note: "Sẵn sàng đăng nhập" },
    { label: "BỊ KHÓA", value: stats.locked || 0, icon: "block", tone: "red", note: "Không thể đăng nhập" },
    { label: "ĐĂNG KÝ MỚI", value: stats.newThisWeek || 0, icon: "trending_up", tone: "mint", note: "Trong 7 ngày gần đây" },
  ];

  const guestCards = [
    { label: "TỔNG KHÁCH VÃNG LAI", value: stats.total || 0, icon: "directions_walk", tone: "blue", note: "Khách không tạo tài khoản" },
    { label: "ĐÃ CÓ ĐƠN ĐẶT", value: stats.withBookings || 0, icon: "event_available", tone: "green", note: "Đã phát sinh đơn đặt sân" },
    { label: "KHÁCH THÂN THIẾT", value: stats.frequent || 0, icon: "workspace_premium", tone: "mint", note: "Từ 2 lượt đặt trở lên" },
    { label: "GHI NHẬN MỚI", value: stats.newThisWeek || 0, icon: "schedule", tone: "red", note: "Trong 7 ngày gần đây" },
  ];

  const cards = isGuestTab ? guestCards : memberCards;

  return (
    <div className="stats-grid">
      {cards.map((card) => (
        <article className={`users-stat-card users-stat-card--${card.tone}`} key={card.label}>
          <div className="users-stat-card__top">
            <span>{card.label}</span>
            <span className="material-symbols-outlined">{card.icon}</span>
          </div>
          <strong>
            {card.value.toLocaleString("vi-VN")}
            <small> {isGuestTab ? "khách" : "tài khoản"}</small>
          </strong>
          <p>
            <span />
            {card.note}
          </p>
        </article>
      ))}
    </div>
  );
}

function UserFilters({ searchQuery, onSearchChange, roleFilter, setRoleFilter, statusFilter, setStatusFilter }) {
  return (
    <section className="users-filter-bar" aria-label="Lọc người dùng">
      <label className="users-filter-search">
        <span className="material-symbols-outlined">search</span>
        <input
          type="search"
          placeholder="Tìm kiếm theo tên, email hoặc số điện thoại..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </label>
      <label className="users-filter-select">
        <span className="material-symbols-outlined">group</span>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label="Lọc theo vai trò"
        >
          <option value="">Vai trò: Tất cả</option>
          {ROLES.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
        <span className="material-symbols-outlined">expand_more</span>
      </label>
      <label className="users-filter-select">
        <span className="material-symbols-outlined">verified_user</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Lọc theo trạng thái"
        >
          <option value="">Trạng thái: Tất cả</option>
          <option value="active">Hoạt động</option>
          <option value="locked">Bị khóa</option>
        </select>
        <span className="material-symbols-outlined">expand_more</span>
      </label>
      <button
        type="button"
        className="users-filter-reset"
        onClick={() => {
          setRoleFilter("");
          setStatusFilter("");
        }}
      >
        Đặt lại
      </button>
    </section>
  );
}

function GuestFilters({ searchQuery, onSearchChange, bookingFilter, setBookingFilter }) {
  return (
    <section className="users-filter-bar" aria-label="Lọc khách vãng lai">
      <label className="users-filter-search">
        <span className="material-symbols-outlined">search</span>
        <input
          type="search"
          placeholder="Tìm kiếm khách vãng lai theo tên, số điện thoại, email..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </label>
      <label className="users-filter-select">
        <span className="material-symbols-outlined">event_available</span>
        <select
          value={bookingFilter}
          onChange={(e) => setBookingFilter(e.target.value)}
          aria-label="Lọc theo lượt đặt"
        >
          <option value="">Lượt đặt: Tất cả</option>
          <option value="has_bookings">Đã từng đặt sân (≥ 1 đơn)</option>
          <option value="frequent">Khách quen (≥ 2 đơn)</option>
          <option value="no_bookings">Chưa phát sinh đơn</option>
        </select>
        <span className="material-symbols-outlined">expand_more</span>
      </label>
      <button
        type="button"
        className="users-filter-reset"
        onClick={() => {
          onSearchChange("");
          setBookingFilter("");
        }}
      >
        Đặt lại
      </button>
    </section>
  );
}

function UserRow({ user, onEdit, onDelete, onToggleStatus }) {
  return (
    <tr className={!user.is_active && user.status === "locked" ? "row-locked" : ""}>
      <td className="users-name-cell">
        <div className="user-identity">
          <span className={`user-initial ${user.status === "locked" ? "locked" : ""}`}>
            {(user.name || "?").trim().charAt(0).toUpperCase()}
          </span>
          <div>
            <strong>{user.name}</strong>
            <small>ID #{String(user.id || "").substring(0, 8).toUpperCase()}</small>
          </div>
        </div>
      </td>
      <td>{user.email || "—"}</td>
      <td>{user.phone || "—"}</td>

      <td>
        <RoleBadge role={user.role} />
      </td>

      <td>
        <StatusBadge status={user.status} />
      </td>

      <td className="action-cell">
        <div className="row-actions">
          <button className="action-btn edit" title="Chỉnh sửa" onClick={() => onEdit(user)}>
            <span className="material-symbols-outlined">edit</span>
          </button>

          {user.status === "active" ? (
            <button
              className="action-btn block"
              title="Khóa tài khoản"
              onClick={() => onToggleStatus(user)}
            >
              <span className="material-symbols-outlined">lock</span>
            </button>
          ) : (
            <button
              className="action-btn enable"
              title="Mở khóa tài khoản"
              onClick={() => onToggleStatus(user)}
            >
              <span className="material-symbols-outlined">lock_open</span>
            </button>
          )}

          {getCurrentUser()?.role === "admin" && (
            <button className="action-btn delete" title="Xóa" onClick={() => onDelete(user.id)}>
              <span className="material-symbols-outlined">delete</span>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function UsersTable({ users, onEdit, onDelete, onToggleStatus }) {
  if (users.length === 0) {
    return (
      <div className="table-card empty-state">
        <span className="material-symbols-outlined">person_search</span>
        <p>Không tìm thấy tài khoản người dùng nào.</p>
      </div>
    );
  }

  return (
    <div className="table-card">
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Họ và tên</th>
              <th>Email</th>
              <th>Số điện thoại</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th className="right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleStatus={onToggleStatus}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <p>Hiển thị {users.length} tài khoản thành viên</p>
      </div>
    </div>
  );
}

function GuestRow({ guest, onEdit, onDelete }) {
  return (
    <tr>
      <td className="users-name-cell">
        <div className="user-identity">
          <span
            className="user-initial"
            style={{ background: "#dbeafe", color: "#1d4ed8", fontWeight: 700 }}
          >
            {(guest.name || "K").trim().charAt(0).toUpperCase()}
          </span>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <strong>{guest.name || "Khách vãng lai"}</strong>
              <span className="guest-badge">Vãng lai</span>
            </div>
            <small>ID #{String(guest.id || "").substring(0, 8).toUpperCase()}</small>
          </div>
        </div>
      </td>
      <td>{guest.email || "—"}</td>
      <td>
        <strong style={{ color: "#0f172a" }}>{guest.phone || "—"}</strong>
      </td>
      <td>
        <span className="booking-count-badge">
          <span className="material-symbols-outlined" style={{ fontSize: "0.95rem" }}>
            event_available
          </span>
          {guest.booking_count || 0} lượt đặt
        </span>
      </td>
      <td>
        <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
          {guest.created_at ? new Date(guest.created_at).toLocaleDateString("vi-VN") : "—"}
        </span>
      </td>
      <td className="action-cell">
        <div className="row-actions">
          <Link
            to={`/admin/bookings?search=${guest.phone || ""}`}
            className="action-btn"
            title="Xem các đơn đặt của khách này"
            style={{ color: "#0284c7" }}
          >
            <span className="material-symbols-outlined">receipt_long</span>
          </Link>
          <button
            className="action-btn edit"
            title="Chỉnh sửa thông tin"
            onClick={() => onEdit(guest)}
          >
            <span className="material-symbols-outlined">edit</span>
          </button>
          {getCurrentUser()?.role === "admin" && (
            <button
              className="action-btn delete"
              title="Xóa khách vãng lai"
              onClick={() => onDelete(guest.id)}
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function GuestsTable({ guests, onEdit, onDelete }) {
  if (guests.length === 0) {
    return (
      <div className="table-card empty-state">
        <span className="material-symbols-outlined">person_off</span>
        <p>Không tìm thấy khách vãng lai nào.</p>
      </div>
    );
  }

  return (
    <div className="table-card">
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Khách hàng</th>
              <th>Email</th>
              <th>Số điện thoại</th>
              <th>Lượt đặt sân</th>
              <th>Ngày ghi nhận</th>
              <th className="right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {guests.map((g) => (
              <GuestRow key={g.id} guest={g} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <p>Hiển thị {guests.length} khách vãng lai</p>
      </div>
    </div>
  );
}

function TipCard({ isGuestTab }) {
  return (
    <div className="tip-card">
      <div className="tip-icon-wrap">
        <span className="material-symbols-outlined">lightbulb</span>
      </div>
      <div>
        <h4>{isGuestTab ? "Mẹo quản lý khách vãng lai" : "Mẹo quản lý người dùng"}</h4>
        <p>
          {isGuestTab
            ? "Khách vãng lai được tự động lưu lại khi họ đặt sân trực tiếp tại quầy hoặc tự đặt trên web không cần mật khẩu. Bạn có thể nhấn vào biểu tượng hóa đơn để xem lại toàn bộ lịch sử thi đấu của số điện thoại đó."
            : "Bạn có thể khóa tài khoản thay vì xóa hẳn để giữ lại lịch sử đặt sân. Tài khoản bị khóa sẽ không thể đăng nhập cho đến khi được mở lại. Sử dụng bộ lọc vai trò để quản lý từng nhóm người dùng hiệu quả hơn."}
        </p>
      </div>
    </div>
  );
}

/* ── Add User Modal (Thành viên có tài khoản) ── */
function AddUserModal({ users, onClose, onSuccess, showToast }) {
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!fullname || !phone || !password) {
      showToast("Vui lòng nhập tên, số điện thoại và mật khẩu", "warning");
      return;
    }

    const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
    if (!phoneRegex.test(phone)) {
      showToast("Số điện thoại không hợp lệ. VD: 0912345678", "warning");
      return;
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showToast("Email không hợp lệ. VD: example@gmail.com", "warning");
        return;
      }
    }

    if (users.some((u) => u.phone === phone)) {
      showToast("Số điện thoại này đã được sử dụng.", "error");
      return;
    }
    if (email && users.some((u) => u.email === email)) {
      showToast("Email này đã được sử dụng.", "error");
      return;
    }

    try {
      setLoading(true);
      await createUser({ fullname, email, phone, password, role });
      showToast("Thêm tài khoản thành công", "success");
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || "Lỗi khi thêm người dùng";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Thêm người dùng mới</h3>
          <button className="modal-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">
                Họ và tên <span className="required">*</span>
              </label>
              <input
                className="form-input"
                type="text"
                placeholder="VD: Nguyễn Văn A"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                placeholder="VD: nguyenvana@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Số điện thoại <span className="required">*</span>
              </label>
              <input
                className="form-input"
                type="text"
                placeholder="VD: 0912345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Mật khẩu <span className="required">*</span>
              </label>
              <input
                className="form-input"
                type="password"
                placeholder="Ít nhất 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Vai trò</label>
              <div className="select-wrap">
                <select
                  className="form-input"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined select-icon">expand_more</span>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Hủy bỏ
          </button>
          <button className="btn-confirm" onClick={handleSubmit} disabled={loading}>
            {loading ? "Đang thêm..." : "Thêm người dùng"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Add Guest Modal (Khách vãng lai không cần mật khẩu) ── */
function AddGuestModal({ onClose, onSuccess, showToast }) {
  const [fullname, setFullname] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!phone.trim()) {
      showToast("Vui lòng nhập số điện thoại khách vãng lai", "warning");
      return;
    }

    try {
      setLoading(true);
      await createGuestCustomer({
        fullname: fullname.trim() || "Khách vãng lai",
        phone: phone.trim(),
        email: email.trim(),
      });
      showToast("Thêm khách vãng lai thành công", "success");
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || "Lỗi khi thêm khách vãng lai";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Thêm khách vãng lai</h3>
          <button className="modal-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-body">
          <p
            style={{
              fontSize: "0.825rem",
              color: "#64748b",
              marginBottom: "16px",
              lineHeight: 1.5,
            }}
          >
            Hồ sơ khách vãng lai giúp bạn quản lý SĐT, họ tên của khách đặt qua điện thoại hoặc khách đá vãng lai tại sân mà không cần cấp tài khoản đăng nhập.
          </p>
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Tên khách / Tên đội bóng</label>
              <input
                className="form-input"
                type="text"
                placeholder="VD: Anh Tuấn (FC Barcelona)"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Số điện thoại <span className="required">*</span>
              </label>
              <input
                className="form-input"
                type="text"
                placeholder="VD: 0912345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email liên hệ (tùy chọn)</label>
              <input
                className="form-input"
                type="email"
                placeholder="VD: anh.tuan@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Hủy bỏ
          </button>
          <button
            className="btn-confirm"
            onClick={handleSubmit}
            disabled={loading}
            style={{ background: "#0284c7" }}
          >
            {loading ? "Đang lưu..." : "Lưu khách vãng lai"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Edit User / Guest Modal ── */
function EditUserModal({ user, onClose, onSuccess, showToast }) {
  const isGuest = user.is_guest;
  const [fullname, setFullname] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [role, setRole] = useState(user.role || "customer");
  const [isActive, setIsActive] = useState(user.status === "active");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!phone) {
      showToast("Số điện thoại không được để trống", "warning");
      return;
    }

    try {
      setLoading(true);
      const payload = isGuest
        ? { fullname, email, phone }
        : { fullname, email, phone, role, is_active: isActive };

      await updateUser(user.id, payload);
      showToast("Cập nhật thành công", "success");
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || "Lỗi khi cập nhật";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{isGuest ? "Sửa thông tin khách vãng lai" : "Chỉnh sửa tài khoản"}</h3>
          <button className="modal-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Họ và tên</label>
              <input
                className="form-input"
                type="text"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Số điện thoại</label>
              <input
                className="form-input"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {!isGuest && (
              <>
                <div className="form-group">
                  <label className="form-label">Vai trò</label>
                  <div className="select-wrap">
                    <select
                      className="form-input"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined select-icon">expand_more</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Trạng thái</label>
                  <div className="toggle-wrap">
                    <button
                      type="button"
                      className={`toggle-btn ${isActive ? "active" : "locked"}`}
                      onClick={() => setIsActive(!isActive)}
                    >
                      <span className="material-symbols-outlined">
                        {isActive ? "lock_open" : "lock"}
                      </span>
                      {isActive ? "Đang hoạt động" : "Đang bị khóa"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Hủy bỏ
          </button>
          <button className="btn-confirm" onClick={handleSubmit} disabled={loading}>
            {loading ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Users Component ── */
export default function Users() {
  const location = useLocation();
  const navigate = useNavigate();

  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [bookingFilter, setBookingFilter] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const { toasts, removeToast, toast } = useToast();

  // Xác định Tab đang active (members | guests) từ URL query
  const queryTab = new URLSearchParams(location.search).get("tab");
  const [activeTab, setActiveTab] = useState(queryTab === "guests" ? "guests" : "members");

  useEffect(() => {
    const t = new URLSearchParams(location.search).get("tab");
    setActiveTab(t === "guests" ? "guests" : "members");
  }, [location.search]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchQuery("");
    if (tab === "guests") {
      navigate("/admin/users?tab=guests");
    } else {
      navigate("/admin/users");
    }
  };

  const loadUsers = () => {
    getUsers()
      .then((res) => {
        setAllUsers(res.data || []);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Tách 2 tập dữ liệu riêng biệt
  const registeredMembers = allUsers.filter((u) => !u.is_guest);
  const guestCustomers = allUsers.filter((u) => u.is_guest);

  // Tính thống kê
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const memberStats = {
    total: registeredMembers.length,
    active: registeredMembers.filter((u) => u.status === "active").length,
    locked: registeredMembers.filter((u) => u.status === "locked").length,
    newThisWeek: registeredMembers.filter(
      (u) => u.created_at && new Date(u.created_at) >= weekAgo
    ).length,
  };

  const guestStats = {
    total: guestCustomers.length,
    withBookings: guestCustomers.filter((u) => (u.booking_count || 0) > 0).length,
    frequent: guestCustomers.filter((u) => (u.booking_count || 0) >= 2).length,
    newThisWeek: guestCustomers.filter(
      (u) => u.created_at && new Date(u.created_at) >= weekAgo
    ).length,
  };

  // Lọc dữ liệu hiển thị theo tab
  const filteredMembers = registeredMembers.filter((u) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (u.name || "").toLowerCase().includes(q);
      const matchEmail = (u.email || "").toLowerCase().includes(q);
      const matchPhone = (u.phone || "").toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPhone) return false;
    }
    if (roleFilter && u.role !== roleFilter) return false;
    if (statusFilter && u.status !== statusFilter) return false;
    return true;
  });

  const filteredGuests = guestCustomers.filter((u) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (u.name || "").toLowerCase().includes(q);
      const matchEmail = (u.email || "").toLowerCase().includes(q);
      const matchPhone = (u.phone || "").toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPhone) return false;
    }
    if (bookingFilter === "has_bookings" && (u.booking_count || 0) < 1) return false;
    if (bookingFilter === "frequent" && (u.booking_count || 0) < 2) return false;
    if (bookingFilter === "no_bookings" && (u.booking_count || 0) > 0) return false;
    return true;
  });

  const handleDelete = async (id) => {
    const isGuest = guestCustomers.some((g) => g.id === id);
    const targetLabel = isGuest ? "khách vãng lai này" : "người dùng này";
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${targetLabel} không?`)) return;
    try {
      await deleteUser(id);
      toast.success("Xóa thành công");
      loadUsers();
    } catch {
      toast.error("Lỗi khi xóa");
    }
  };

  const handleToggleStatus = async (user) => {
    const action = user.status === "active" ? "khóa" : "mở khóa";
    if (!window.confirm(`Bạn có muốn ${action} tài khoản "${user.name}" không?`)) return;
    try {
      await toggleUserStatus(user.id);
      toast.success(`Đã ${action} tài khoản thành công!`);
      loadUsers();
    } catch {
      toast.error(`Lỗi khi ${action} tài khoản`);
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <AdminSidebar />
      <TopHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeTab={activeTab}
        onAddNew={() => {
          if (activeTab === "guests") {
            setShowAddGuestModal(true);
          } else {
            setShowAddModal(true);
          }
        }}
      />

      <main className="main-content users-admin-main">
        <div className="content-inner">
          {/* Page Header */}
          <div className="page-header">
            <div>
              <span className="users-page-eyebrow">
                VẬN HÀNH HỆ THỐNG <span>›</span>{" "}
                {activeTab === "guests" ? "KHÁCH VÃNG LAI & ĐẶT SÂN" : "THÀNH VIÊN & PHÂN QUYỀN"}
              </span>
              <h2>{activeTab === "guests" ? "Quản lý khách vãng lai" : "Quản lý người dùng"}</h2>
              <p>
                {activeTab === "guests"
                  ? "Danh sách khách đặt sân tại quầy hoặc qua website không đăng ký tài khoản."
                  : "Xem, phân quyền và quản lý trạng thái tài khoản trong toàn bộ hệ sinh thái Football Booking."}
              </p>
            </div>
            <div className="header-controls">
              {activeTab === "guests" ? (
                <button
                  className="btn-add-guest"
                  onClick={() => setShowAddGuestModal(true)}
                >
                  <span className="material-symbols-outlined">person_add</span>
                  Thêm khách vãng lai
                </button>
              ) : (
                <button className="btn-add-user" onClick={() => setShowAddModal(true)}>
                  <span className="material-symbols-outlined">person_add</span>
                  Thêm người dùng
                </button>
              )}
            </div>
          </div>

          {/* ── Mode Tabs: Phân tách rõ ràng Thành viên vs Khách vãng lai ── */}
          <div className="users-mode-tabs">
            <button
              type="button"
              className={`users-mode-tab ${activeTab === "members" ? "active" : ""}`}
              onClick={() => handleTabChange("members")}
            >
              <span className="material-symbols-outlined">badge</span>
              Tài khoản hệ thống
              <span className="tab-badge">{registeredMembers.length}</span>
            </button>
            <button
              type="button"
              className={`users-mode-tab ${activeTab === "guests" ? "active" : ""}`}
              onClick={() => handleTabChange("guests")}
            >
              <span className="material-symbols-outlined">directions_walk</span>
              Khách vãng lai (Không tài khoản)
              <span className="tab-badge">{guestCustomers.length}</span>
            </button>
          </div>

          {/* Stats Grid */}
          <StatsGrid
            stats={activeTab === "guests" ? guestStats : memberStats}
            isGuestTab={activeTab === "guests"}
          />

          {/* Filters & Tables based on Active Tab */}
          {activeTab === "guests" ? (
            <>
              <GuestFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                bookingFilter={bookingFilter}
                setBookingFilter={setBookingFilter}
              />
              <GuestsTable
                guests={filteredGuests}
                onEdit={setEditingUser}
                onDelete={handleDelete}
              />
            </>
          ) : (
            <>
              <UserFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                roleFilter={roleFilter}
                setRoleFilter={setRoleFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
              />
              <UsersTable
                users={filteredMembers}
                onEdit={setEditingUser}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
              />
            </>
          )}

          {/* Tip */}
          <TipCard isGuestTab={activeTab === "guests"} />
        </div>
      </main>

      {/* Modals */}
      {showAddModal && (
        <AddUserModal
          users={allUsers}
          onClose={() => setShowAddModal(false)}
          onSuccess={loadUsers}
          showToast={(msg, type) => toast[type || "info"](msg)}
        />
      )}
      {showAddGuestModal && (
        <AddGuestModal
          onClose={() => setShowAddGuestModal(false)}
          onSuccess={loadUsers}
          showToast={(msg, type) => toast[type || "info"](msg)}
        />
      )}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={loadUsers}
          showToast={(msg, type) => toast[type || "info"](msg)}
        />
      )}
    </>
  );
}