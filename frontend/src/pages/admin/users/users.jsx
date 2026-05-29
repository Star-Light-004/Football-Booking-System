import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getUsers, createUser, updateUser, deleteUser } from "../../../api/usersApi";

import './users.css';
/* ── Data ── */
const navLinks = [
  { icon: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
  { icon: 'stadium', label: 'Fields', path: '/admin/fields' },
  { icon: 'event_available', label: 'Bookings', path: '/admin/bookings' },
  { icon: 'group', label: 'Users', path: '/admin/users' },
  { icon: 'payments', label: 'Revenue', path: '/admin/revenue' },
  { icon: 'calendar_month', label: 'Time Slots', path: '/admin/timeslots' },
  { icon: 'inventory_2', label: 'Services', path: '/admin/services' },
];
 

 

 
/* ── Sub-components ── */
function Sidebar() {

  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>Pitch & Pulse</h1>
        <p>Admin Console</p>
      </div>

      <nav className="sidebar-nav">
        {navLinks.map(({ icon, label, path }) => (
          <Link
            key={label}
            to={path}
            className={`nav-link ${
              location.pathname === path ? "active" : ""
            }`}
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
 
function TopHeader() {
  return (
    <header className="top-header">
      <div className="search-box">
        <span className="material-symbols-outlined search-icon">search</span>
        <input type="text" placeholder="Tìm kiếm người dùng..." />
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
        <p>Bị vô hiệu hóa</p>
        <span>{stats.disabled}</span>
      </div>

      <div className="stat-card">
        <p>Đăng ký mới</p>
        <span>{stats.newThisWeek}</span>
      </div>
    </div>
  );
}
 
function UserRow({ user, onEdit, onDelete }) {
  return (
    <tr>
      <td>{user.name}</td>
      <td>{user.email}</td>
      <td>{user.phone}</td>

      <td>
        <span className="role-badge">
          {user.role || "customer"}
        </span>
      </td>

      <td>
        <span className="status">
          {user.status || "active"}
        </span>
      </td>

      {/* ACTIONS GIỮ NGUYÊN */}
      <td className="action-cell">
        <div className="row-actions">

          <button className="action-btn edit" title="Edit" onClick={() => onEdit(user)}>
            <span className="material-symbols-outlined">edit</span>
          </button>

          {user.status === "active" ? (
            <button className="action-btn block" title="Disable">
              <span className="material-symbols-outlined">block</span>
            </button>
          ) : (
            <button className="action-btn enable" title="Enable">
              <span className="material-symbols-outlined">check_circle</span>
            </button>
          )}

          <button className="action-btn delete" title="Delete" onClick={() => onDelete(user.id)}>
            <span className="material-symbols-outlined">delete</span>
          </button>

        </div>
      </td>
    </tr>
  );
}

 
function UsersTable({ users, onEdit, onDelete }) {
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
            {users.map((u) => <UserRow key={u.id} user={u} onEdit={onEdit} onDelete={onDelete} />)}
          </tbody>
        </table>
      </div>
 
      {/* Pagination */}
      <div className="table-footer">
        <p>Hiển thị 1 - 4 trên 1,284 người dùng</p>
        <div className="pagination">
          <button className="page-btn icon-btn-page" disabled>
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button className="page-btn active">1</button>
          <button className="page-btn">2</button>
          <button className="page-btn">3</button>
          <span className="page-ellipsis">...</span>
          <button className="page-btn">321</button>
          <button className="page-btn icon-btn-page next">
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
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
          Bạn có thể vô hiệu hóa tài khoản của người dùng thay vì xóa hẳn để giữ lại
          lịch sử đặt sân của họ. Tài khoản bị vô hiệu hóa sẽ không thể đăng nhập cho
          đến khi được mở lại.
        </p>
      </div>
    </div>
  );
}

function AddUserModal({ users, onClose, onSuccess }) {
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!fullname || !phone || !password) {
      alert("Vui lòng nhập tên, số điện thoại và mật khẩu");
      return;
    }
    
    // Regex validations
    const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
    if (!phoneRegex.test(phone)) {
      alert("Số điện thoại không hợp lệ. Vui lòng nhập đúng định dạng (VD: 0912345678).");
      return;
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        alert("Email không hợp lệ. Vui lòng nhập đúng định dạng (VD: example@gmail.com).");
        return;
      }
    }

    // Duplication checks
    const isPhoneDuplicate = users.some(u => u.phone === phone);
    if (isPhoneDuplicate) {
      alert("Số điện thoại này đã được sử dụng. Vui lòng nhập số khác.");
      return;
    }

    if (email) {
      const isEmailDuplicate = users.some(u => u.email === email);
      if (isEmailDuplicate) {
        alert("Email này đã được sử dụng. Vui lòng nhập email khác.");
        return;
      }
    }

    try {
      setLoading(true);
      await createUser({ fullname, email, phone, password });
      alert("Thêm người dùng thành công");
      onSuccess();
      onClose();
    } catch (err) {
      console.log(err);
      alert("Lỗi khi thêm người dùng");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Thêm người dùng</h3>
          <button className="modal-close" onClick={onClose}><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Họ và tên</label>
              <input className="form-input" type="text" placeholder="VD: Nguyễn Văn A" value={fullname} onChange={e => setFullname(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="VD: nguyenvana@gmail.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Số điện thoại</label>
              <input className="form-input" type="text" placeholder="VD: 0912345678" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="form-group full">
              <label className="form-label">Mật khẩu</label>
              <input className="form-input" type="password" placeholder="Ít nhất 6 ký tự" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Hủy bỏ</button>
          <button className="btn-confirm" onClick={handleSubmit} disabled={loading}>{loading ? "Đang thêm..." : "Thêm"}</button>
        </div>
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose, onSuccess }) {
  const [fullname, setFullname] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await updateUser(user.id, { fullname, email, phone });
      alert("Cập nhật người dùng thành công");
      onSuccess();
      onClose();
    } catch (err) {
      console.log(err);
      alert("Lỗi khi cập nhật");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Sửa người dùng</h3>
          <button className="modal-close" onClick={onClose}><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Họ và tên</label>
              <input className="form-input" type="text" value={fullname} onChange={e => setFullname(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Số điện thoại</label>
              <input className="form-input" type="text" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Hủy bỏ</button>
          <button className="btn-confirm" onClick={handleSubmit} disabled={loading}>{loading ? "Đang cập nhật..." : "Lưu thay đổi"}</button>
        </div>
      </div>
    </div>
  );
}
 
/* ── Main Users Component ── */
export default function Users() {
  
  const [users, setUsers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [stats, setStats] = useState({
  total: 0,
  active: 0,
  disabled: 0,
  newThisWeek: 0,
});

  const loadUsers = () => {
    getUsers()
      .then(res => {
        const data = res.data;
        setUsers(data);
        const total = data.length;
        const active = data.filter(u => u.status === "active").length;
        const disabled = data.filter(u => u.status === "disabled").length;
        setStats({
          total,
          active,
          disabled,
          newThisWeek: 0, 
        });
      })
      .catch(err => console.log(err));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa người dùng này không?")) {
      try {
        await deleteUser(id);
        alert("Xóa thành công");
        loadUsers();
      } catch (err) {
        alert("Lỗi khi xóa");
      }
    }
  };
  return (
    <>
      <Sidebar />
      <TopHeader />
 
      <main className="main-content">
        <div className="content-inner">
          {/* Page Header */}
          <div className="page-header">
            <div>
              <h2>Quản lý người dùng</h2>
              <p>Xem và điều chỉnh quyền truy cập của các thành viên trong hệ thống.</p>
            </div>
            <div className="header-controls">
              <div className="role-select-wrap">
                <select>
                  <option value="">Tất cả vai trò</option>
                  <option value="admin">Quản trị viên</option>
                  <option value="customer">Khách hàng</option>
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
          <UsersTable users={users} onEdit={setEditingUser} onDelete={handleDelete} />
 
          {/* Tip */}
          <TipCard />
        </div>
      </main>

      {showAddModal && <AddUserModal users={users} onClose={() => setShowAddModal(false)} onSuccess={loadUsers} />}
      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSuccess={loadUsers} />}
    </>
  );
}