import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
} from "../../../api/usersApi";

import './users.css';
import { useToast, ToastContainer } from "../../../components/Toast/Toast";

/* ── Constants ── */
const ROLES = [
  { value: 'customer', label: 'Khách hàng' },
  { value: 'staff',    label: 'Nhân viên'   },
  { value: 'admin',    label: 'Quản trị viên' },
];

const navLinks = [
  { icon: 'dashboard',       label: 'Dashboard',   path: '/admin/dashboard' },
  { icon: 'stadium',         label: 'Fields',       path: '/admin/fields'    },
  { icon: 'event_available', label: 'Bookings',     path: '/admin/bookings'  },
  { icon: 'group',           label: 'Users',        path: '/admin/users'     },
  { icon: 'payments',        label: 'Revenue',      path: '/admin/revenue'   },
  { icon: 'calendar_month',  label: 'Time Slots',   path: '/admin/timeslots' },
  { icon: 'inventory_2',     label: 'Services',     path: '/admin/services'  },
  { icon: 'settings',        label: 'Settings',     path: '/admin/settings'  },
];

/* ── Role Badge helper ── */
function RoleBadge({ role }) {
  const map = {
    customer: { label: 'Khách hàng',    cls: 'role-badge customer' },
    staff:    { label: 'Nhân viên',     cls: 'role-badge staff'    },
    admin:    { label: 'Quản trị viên', cls: 'role-badge admin'    },
  };
  const info = map[role] || map['customer'];
  return <span className={info.cls}>{info.label}</span>;
}

/* ── Status Badge helper ── */
function StatusBadge({ status }) {
  const isActive = status === 'active';
  return (
    <span className={`status-indicator ${isActive ? 'active' : 'locked'}`}>
      <span className={`status-dot ${isActive ? 'green' : 'red'}`} />
      {isActive ? 'Hoạt động' : 'Bị khóa'}
    </span>
  );
}

/* ── Sub-components ── */
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
            {label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-profile">
        <div className="sidebar-profile-inner">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCjHUmac9-JS-Qon7vvMjjjeTt-ssVMiTer_E6AUt8nT0PDNm94h3v-wlLgX6PFrp6Oklu0DscnCaBBbOWiYSzvDEx6FxmKuFnk7XlHDzFCEAl3V6QW1vvv6p0EMtlsYM6ls6zVjICKpnB8LGAxqOUkDO_KHV4w02UE4YdRril2mwkmsR-trX_FJpawnkghiJ57tG84ih0cqpnY7igmFVqkU8x5J3XL--7ImZ9By1Jxb5_8PgIrWN54cIYE7BiXqGNsg0JHqWy0Nv8"
            alt="Admin"
          />
          <div>
            <p className="profile-name">Quản trị viên</p>
            <p className="profile-email">admin@pitchpulse.vn</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopHeader({ searchQuery, onSearchChange }) {
  return (
    <header className="top-header">
      <div className="search-box">
        <span className="material-symbols-outlined search-icon">search</span>
        <input
          type="text"
          placeholder="Tìm kiếm người dùng..."
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
        <button className="btn-new-booking">New Booking</button>
      </div>
    </header>
  );
}

function StatsGrid({ stats }) {
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <p>Tổng người dùng</p>
        <span>{stats.total}</span>
      </div>
      <div className="stat-card">
        <p>Đang hoạt động</p>
        <span>{stats.active}</span>
      </div>
      <div className="stat-card">
        <p>Bị khóa</p>
        <span>{stats.locked}</span>
      </div>
      <div className="stat-card">
        <p>Đăng ký mới (7 ngày)</p>
        <span>{stats.newThisWeek}</span>
      </div>
    </div>
  );
}

function UserRow({ user, onEdit, onDelete, onToggleStatus }) {
  return (
    <tr className={!user.is_active && user.status === 'locked' ? 'row-locked' : ''}>
      <td>{user.name}</td>
      <td>{user.email || '—'}</td>
      <td>{user.phone || '—'}</td>

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

          {user.status === 'active' ? (
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

          <button className="action-btn delete" title="Xóa" onClick={() => onDelete(user.id)}>
            <span className="material-symbols-outlined">delete</span>
          </button>
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
        <p>Không tìm thấy người dùng nào.</p>
      </div>
    );
  }

  return (
    <div className="table-card">
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Tên người dùng</th>
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
        <p>Hiển thị {users.length} người dùng</p>
      </div>
    </div>
  );
}

function TipCard() {
  return (
    <div className="tip-card">
      <div className="tip-icon-wrap">
        <span className="material-symbols-outlined">lightbulb</span>
      </div>
      <div>
        <h4>Mẹo quản lý người dùng</h4>
        <p>
          Bạn có thể khóa tài khoản thay vì xóa hẳn để giữ lại lịch sử đặt sân.
          Tài khoản bị khóa sẽ không thể đăng nhập cho đến khi được mở lại.
          Sử dụng bộ lọc vai trò để quản lý từng nhóm người dùng hiệu quả hơn.
        </p>
      </div>
    </div>
  );
}

/* ── Add User Modal ── */
function AddUserModal({ users, onClose, onSuccess, showToast }) {
  const [fullname,  setFullname]  = useState('');
  const [email,     setEmail]     = useState('');
  const [phone,     setPhone]     = useState('');
  const [password,  setPassword]  = useState('');
  const [role,      setRole]      = useState('customer');
  const [loading,   setLoading]   = useState(false);

  const handleSubmit = async () => {
    if (!fullname || !phone || !password) {
      showToast('Vui lòng nhập tên, số điện thoại và mật khẩu', 'warning');
      return;
    }

    const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
    if (!phoneRegex.test(phone)) {
      showToast('Số điện thoại không hợp lệ. VD: 0912345678', 'warning');
      return;
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showToast('Email không hợp lệ. VD: example@gmail.com', 'warning');
        return;
      }
    }

    if (users.some((u) => u.phone === phone)) {
      showToast('Số điện thoại này đã được sử dụng.', 'error');
      return;
    }
    if (email && users.some((u) => u.email === email)) {
      showToast('Email này đã được sử dụng.', 'error');
      return;
    }

    try {
      setLoading(true);
      await createUser({ fullname, email, phone, password, role });
      showToast('Thêm người dùng thành công', 'success');
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || 'Lỗi khi thêm người dùng';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Thêm người dùng</h3>
          <button className="modal-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Họ và tên <span className="required">*</span></label>
              <input className="form-input" type="text" placeholder="VD: Nguyễn Văn A"
                value={fullname} onChange={(e) => setFullname(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="VD: nguyenvana@gmail.com"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Số điện thoại <span className="required">*</span></label>
              <input className="form-input" type="text" placeholder="VD: 0912345678"
                value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Mật khẩu <span className="required">*</span></label>
              <input className="form-input" type="password" placeholder="Ít nhất 6 ký tự"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Vai trò</label>
              <div className="select-wrap">
                <select className="form-input" value={role} onChange={(e) => setRole(e.target.value)}>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined select-icon">expand_more</span>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Hủy bỏ</button>
          <button className="btn-confirm" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Đang thêm...' : 'Thêm người dùng'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Edit User Modal ── */
function EditUserModal({ user, onClose, onSuccess, showToast }) {
  const [fullname,  setFullname]  = useState(user.name  || '');
  const [email,     setEmail]     = useState(user.email || '');
  const [phone,     setPhone]     = useState(user.phone || '');
  const [role,      setRole]      = useState(user.role  || 'customer');
  const [isActive,  setIsActive]  = useState(user.status === 'active');
  const [loading,   setLoading]   = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await updateUser(user.id, { fullname, email, phone, role, is_active: isActive });
      showToast('Cập nhật người dùng thành công', 'success');
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || 'Lỗi khi cập nhật';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Chỉnh sửa người dùng</h3>
          <button className="modal-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Họ và tên</label>
              <input className="form-input" type="text"
                value={fullname} onChange={(e) => setFullname(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Số điện thoại</label>
              <input className="form-input" type="text"
                value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Vai trò</label>
              <div className="select-wrap">
                <select className="form-input" value={role} onChange={(e) => setRole(e.target.value)}>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
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
                  className={`toggle-btn ${isActive ? 'active' : 'locked'}`}
                  onClick={() => setIsActive(!isActive)}
                >
                  <span className="material-symbols-outlined">
                    {isActive ? 'lock_open' : 'lock'}
                  </span>
                  {isActive ? 'Đang hoạt động' : 'Đang bị khóa'}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Hủy bỏ</button>
          <button className="btn-confirm" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Users Component ── */
export default function Users() {
  const [allUsers,    setAllUsers]    = useState([]);
  const [filtered,    setFiltered]    = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter,  setRoleFilter]  = useState('');
  const [statusFilter,setStatusFilter]= useState('');
  const [showAddModal,setShowAddModal]= useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [stats, setStats] = useState({ total: 0, active: 0, locked: 0, newThisWeek: 0 });
  const { toasts, removeToast, toast } = useToast();

  const loadUsers = () => {
    getUsers()
      .then((res) => {
        const data = res.data;
        setAllUsers(data);

        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        setStats({
          total:       data.length,
          active:      data.filter((u) => u.status === 'active').length,
          locked:      data.filter((u) => u.status === 'locked').length,
          newThisWeek: data.filter((u) => u.created_at && new Date(u.created_at) >= weekAgo).length,
        });
      })
      .catch((err) => console.error(err));
  };

  // ── Filter logic ────────────────────────────────────────────────────────
  useEffect(() => {
    let result = [...allUsers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          (u.name  || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.phone || '').toLowerCase().includes(q)
      );
    }
    if (roleFilter)   result = result.filter((u) => u.role   === roleFilter);
    if (statusFilter) result = result.filter((u) => u.status === statusFilter);

    setFiltered(result);
  }, [allUsers, searchQuery, roleFilter, statusFilter]);

  useEffect(() => { loadUsers(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa người dùng này không?')) return;
    try {
      await deleteUser(id);
      toast.success('Xóa thành công');
      loadUsers();
    } catch {
      toast.error('Lỗi khi xóa');
    }
  };

  const handleToggleStatus = async (user) => {
    const action = user.status === 'active' ? 'khóa' : 'mở khóa';
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
      <Sidebar />
      <TopHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <main className="main-content">
        <div className="content-inner">
          {/* Page Header */}
          <div className="page-header">
            <div>
              <h2>Quản lý người dùng</h2>
              <p>Xem, phân quyền và quản lý trạng thái tài khoản trong hệ thống.</p>
            </div>
            <div className="header-controls">
              {/* Filter: Role */}
              <div className="role-select-wrap">
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                  <option value="">Tất cả vai trò</option>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined select-arrow">expand_more</span>
              </div>

              {/* Filter: Status */}
              <div className="role-select-wrap">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">Tất cả trạng thái</option>
                  <option value="active">Hoạt động</option>
                  <option value="locked">Bị khóa</option>
                </select>
                <span className="material-symbols-outlined select-arrow">expand_more</span>
              </div>

              <button className="btn-add-user" onClick={() => setShowAddModal(true)}>
                <span className="material-symbols-outlined">person_add</span>
                Thêm người dùng
              </button>
            </div>
          </div>

          {/* Stats */}
          <StatsGrid stats={stats} />

          {/* Table */}
          <UsersTable
            users={filtered}
            onEdit={setEditingUser}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
          />

          {/* Tip */}
          <TipCard />
        </div>
      </main>

      {showAddModal && (
        <AddUserModal
          users={allUsers}
          onClose={() => setShowAddModal(false)}
          onSuccess={loadUsers}
          showToast={(msg, type) => toast[type || 'info'](msg)}
        />
      )}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={loadUsers}
          showToast={(msg, type) => toast[type || 'info'](msg)}
        />
      )}
    </>
  );
}