import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  getUsers,
  getRolePermissions,
  updateRolePermissions,
  resetRolePermissions,
} from "../../../api/usersApi";
import './user-roles.css';
import { useToast, ToastContainer } from "../../../components/Toast/Toast";
import { DEFAULT_PERMISSIONS, ALL_PERMISSION_KEYS } from "../../../utils/permissionUtils";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";

/* ── Constants: 9 Roles ── */
const ROLES = [
  { value: 'customer',      label: 'Người dùng',            icon: 'person',               color: 'gray'   },
  { value: 'field_owner',   label: 'Chủ sân',               icon: 'business_center',      color: 'amber'  },
  { value: 'field_manager', label: 'Người quản lý sân',     icon: 'manage_accounts',      color: 'teal'   },
  { value: 'receptionist',  label: 'Lễ tân',                icon: 'support_agent',        color: 'cyan'   },
  { value: 'cashier',       label: 'Nhân viên thu ngân',    icon: 'point_of_sale',        color: 'green'  },
  { value: 'cleaner',       label: 'Nhân viên dọn dẹp',     icon: 'cleaning_services',    color: 'lime'   },
  { value: 'service_staff', label: 'Nhân viên dịch vụ',     icon: 'room_service',         color: 'orange' },
  { value: 'maintenance',   label: 'Nhân viên bảo trì sân', icon: 'construction',         color: 'red'    },
  { value: 'admin',         label: 'Quản trị viên',         icon: 'admin_panel_settings', color: 'purple' },
];

/* ── Granular CRUD Permission Modules ── */
const PERMISSION_MODULES = [
  {
    key: 'bookings',
    label: 'Quản lý đặt sân',
    icon: 'event_available',
    actions: [
      { key: 'bookings_view',   label: 'Xem',     abbr: 'R', type: 'read',   title: 'Xem danh sách và lịch đặt sân' },
      { key: 'bookings_create', label: 'Tạo',     abbr: 'C', type: 'create', title: 'Tạo đơn đặt sân mới' },
      { key: 'bookings_edit',   label: 'Sửa',     abbr: 'U', type: 'update', title: 'Đổi giờ, nhận sân, thêm dịch vụ' },
      { key: 'bookings_cancel', label: 'Hủy/Xóa', abbr: 'D', type: 'delete', title: 'Hủy đơn hoặc xóa đơn đặt sân' },
    ]
  },
  {
    key: 'fields',
    label: 'Quản lý sân bóng',
    icon: 'stadium',
    actions: [
      { key: 'fields_view',   label: 'Xem',  abbr: 'R', type: 'read',   title: 'Xem danh sách sân bóng' },
      { key: 'fields_create', label: 'Thêm', abbr: 'C', type: 'create', title: 'Thêm sân bóng mới vào hệ thống' },
      { key: 'fields_edit',   label: 'Sửa',  abbr: 'U', type: 'update', title: 'Sửa tên sân, kích thước, ảnh' },
      { key: 'fields_delete', label: 'Xóa',  abbr: 'D', type: 'delete', title: 'Xóa sân bóng' },
    ]
  },
  {
    key: 'timeslots',
    label: 'Khung giờ & Bảng giá',
    icon: 'calendar_month',
    actions: [
      { key: 'timeslots_view',   label: 'Xem',  abbr: 'R', type: 'read',   title: 'Xem khung giờ hoạt động' },
      { key: 'timeslots_create', label: 'Tạo',  abbr: 'C', type: 'create', title: 'Tạo khung giờ mới' },
      { key: 'timeslots_edit',   label: 'Sửa',  abbr: 'U', type: 'update', title: 'Cài đặt và sửa giá theo giờ' },
      { key: 'timeslots_delete', label: 'Xóa',  abbr: 'D', type: 'delete', title: 'Xóa khung giờ' },
    ]
  },
  {
    key: 'services',
    label: 'Dịch vụ & Đồ uống',
    icon: 'inventory_2',
    actions: [
      { key: 'services_view',   label: 'Xem',  abbr: 'R', type: 'read',   title: 'Xem danh mục nước, giày, áo' },
      { key: 'services_create', label: 'Thêm', abbr: 'C', type: 'create', title: 'Thêm dịch vụ tiện ích mới' },
      { key: 'services_edit',   label: 'Sửa',  abbr: 'U', type: 'update', title: 'Cập nhật giá và số lượng tồn' },
      { key: 'services_delete', label: 'Xóa',  abbr: 'D', type: 'delete', title: 'Xóa dịch vụ' },
    ]
  },
  {
    key: 'users',
    label: 'Người dùng & Nhân sự',
    icon: 'group',
    actions: [
      { key: 'users_view',   label: 'Xem',  abbr: 'R', type: 'read',   title: 'Xem danh sách tài khoản' },
      { key: 'users_create', label: 'Thêm', abbr: 'C', type: 'create', title: 'Tạo tài khoản nhân viên mới' },
      { key: 'users_edit',   label: 'Sửa',  abbr: 'U', type: 'update', title: 'Sửa thông tin hoặc khóa tài khoản' },
      { key: 'users_delete', label: 'Xóa',  abbr: 'D', type: 'delete', title: 'Xóa tài khoản vĩnh viễn' },
    ]
  },
  {
    key: 'revenue',
    label: 'Doanh thu & Báo cáo',
    icon: 'payments',
    actions: [
      { key: 'revenue_view',   label: 'Xem',  abbr: 'R', type: 'read',   title: 'Xem báo cáo doanh thu tài chính' },
      { key: 'revenue_export', label: 'Xuất', abbr: 'E', type: 'export', title: 'Xuất báo cáo / In phiếu thu' },
    ]
  },
  {
    key: 'vouchers',
    label: 'Voucher & Khuyến mãi',
    icon: 'confirmation_number',
    actions: [
      { key: 'vouchers_view',   label: 'Xem',  abbr: 'R', type: 'read',   title: 'Xem danh sách chính sách và lịch sử phát voucher' },
      { key: 'vouchers_create', label: 'Thêm', abbr: 'C', type: 'create', title: 'Tạo chương trình voucher mới' },
      { key: 'vouchers_edit',   label: 'Sửa',  abbr: 'U', type: 'update', title: 'Sửa mức giảm, số lượng và bật/tắt voucher' },
      { key: 'vouchers_delete', label: 'Xóa',  abbr: 'D', type: 'delete', title: 'Xóa voucher' },
    ]
  },
  {
    key: 'operations',
    label: 'Vận hành sân bãi',
    icon: 'construction',
    actions: [
      { key: 'maintenance_manage', label: 'Bảo trì', abbr: 'BT', type: 'update', title: 'Lên lịch bảo trì mặt sân / đèn chiếu sáng' },
      { key: 'cleaning_manage',    label: 'Vệ sinh', abbr: 'VS', type: 'update', title: 'Quản lý lịch dọn dẹp vệ sinh sân' },
    ]
  },
  {
    key: 'system',
    label: 'Hệ thống & Cài đặt',
    icon: 'tune',
    actions: [
      { key: 'dashboard_view',   label: 'Tổng quan', abbr: 'DB', type: 'read',   title: 'Xem bảng điều khiển Dashboard' },
      { key: 'settings_manage',  label: 'Cài đặt',   abbr: 'CF', type: 'update', title: 'Cấu hình thông tin hệ thống' },
    ]
  },
];



function TopHeader() {
  return (
    <header className="top-header">
      <div className="search-box">
        <span className="material-symbols-outlined search-icon">search</span>
        <input type="text" placeholder="Tìm kiếm vai trò hoặc quyền..." />
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
        <button className="btn-new-booking">Hải Châu Arena</button>
      </div>
    </header>
  );
}

/* ── Role Card with Modular CRUD Matrix ── */
function RoleCard({
  role,
  permissions,
  onPermissionToggle,
  onModuleToggle,
  onBulkToggle,
  userCount,
}) {
  const isAdmin = role.value === 'admin';
  const totalPossible = ALL_PERMISSION_KEYS.length;
  const activeCount = isAdmin ? totalPossible : permissions.length;

  return (
    <div className={`role-card role-card--${role.color}`}>
      {/* Card Header */}
      <div className="role-card-header">
        <div className="role-icon">
          <span className="material-symbols-outlined">{role.icon}</span>
        </div>
        <div className="role-info">
          <h3>{role.label}</h3>
          <p>{userCount} người dùng hiện có</p>
        </div>
      </div>

      {/* Quick Actions & Counter */}
      <div className="role-card-quick-actions">
        <span className="role-perm-count">
          <span className="material-symbols-outlined">verified_user</span>
          {activeCount} / {totalPossible} quyền
        </span>

        {!isAdmin ? (
          <div className="role-bulk-btns">
            <button
              type="button"
              className="role-bulk-btn"
              onClick={() => onBulkToggle(role.value, true)}
              title="Kích hoạt tất cả quyền cho vai trò này"
            >
              Chọn tất cả
            </button>
            <button
              type="button"
              className="role-bulk-btn clear"
              onClick={() => onBulkToggle(role.value, false)}
              title="Bỏ chọn tất cả quyền"
            >
              Xóa hết
            </button>
          </div>
        ) : (
          <span style={{ fontSize: '0.72rem', color: '#6d28d9', fontWeight: 700 }}>
            Toàn quyền hệ thống
          </span>
        )}
      </div>

      {/* Permissions Modular List */}
      <div className="role-permissions">
        <p className="permissions-label">Chi tiết quyền CRUD theo Module</p>
        <div className="role-modules-list">
          {PERMISSION_MODULES.map((mod) => {
            const modActionKeys = mod.actions.map(a => a.key);
            const activeModuleActions = modActionKeys.filter(k => isAdmin || permissions.includes(k));
            const isAllModActive = activeModuleActions.length === modActionKeys.length;

            return (
              <div key={mod.key} className="crud-module-box">
                <div className="crud-module-header">
                  <div
                    className="crud-module-title"
                    onClick={() => !isAdmin && onModuleToggle(role.value, mod)}
                    title={`Bật/Tắt toàn bộ quyền trong ${mod.label}`}
                  >
                    <span className="material-symbols-outlined">{mod.icon}</span>
                    <span>{mod.label}</span>
                  </div>

                  {!isAdmin && (
                    <button
                      type="button"
                      className={`crud-module-toggle ${isAllModActive ? 'all-on' : ''}`}
                      onClick={() => onModuleToggle(role.value, mod)}
                      title="Bật/Tắt tất cả hành động của module này"
                    >
                      {isAllModActive ? 'Đủ quyền' : `${activeModuleActions.length}/${modActionKeys.length}`}
                    </button>
                  )}
                </div>

                {/* CRUD Action Pills */}
                <div className="crud-actions-grid">
                  {mod.actions.map((act) => {
                    const isChecked = isAdmin || permissions.includes(act.key);
                    return (
                      <button
                        key={act.key}
                        type="button"
                        disabled={isAdmin}
                        className={`crud-action-pill pill-${act.type} ${isChecked ? 'active' : ''}`}
                        onClick={() => onPermissionToggle(role.value, act.key)}
                        title={act.title}
                      >
                        <span className="crud-pill-dot" />
                        <span>{act.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function UserCountByRole({ users }) {
  const counts = {
    customer:      users.filter(u => u.role === 'customer').length,
    field_owner:   users.filter(u => u.role === 'field_owner').length,
    field_manager: users.filter(u => u.role === 'field_manager').length,
    receptionist:  users.filter(u => u.role === 'receptionist').length,
    cashier:       users.filter(u => u.role === 'cashier').length,
    cleaner:       users.filter(u => u.role === 'cleaner').length,
    service_staff: users.filter(u => u.role === 'service_staff').length,
    maintenance:   users.filter(u => u.role === 'maintenance').length,
    admin:         users.filter(u => u.role === 'admin').length,
  };
  return counts;
}

/* ── Main Component ── */
export default function UserRoles() {
  const [users, setUsers] = useState([]);
  const [rolePermissions, setRolePermissions] = useState(() => {
    try {
      const saved = localStorage.getItem('rolePermissions');
      return saved ? JSON.parse(saved) : DEFAULT_PERMISSIONS;
    } catch {
      return DEFAULT_PERMISSIONS;
    }
  });
  const [loading, setLoading] = useState(false);
  const [activeRoleFilter, setActiveRoleFilter] = useState('all');
  const { toasts, removeToast, toast } = useToast();

  useEffect(() => {
    loadUsers();
    loadPermissions();
  }, []);

  const loadUsers = () => {
    getUsers()
      .then((res) => {
        setUsers(res.data);
      })
      .catch((err) => console.error(err));
  };

  const loadPermissions = () => {
    getRolePermissions()
      .then((res) => {
        if (res.data && typeof res.data === 'object') {
          setRolePermissions(res.data);
          localStorage.setItem('rolePermissions', JSON.stringify(res.data));
        }
      })
      .catch((err) => {
        console.warn('Không thể tải quyền từ server, dùng cache trình duyệt:', err);
      });
  };

  // Bật/tắt 1 quyền đơn lẻ
  const handlePermissionToggle = (role, permission) => {
    const currentPerms = rolePermissions[role] || [];
    const newPerms = currentPerms.includes(permission)
      ? currentPerms.filter(p => p !== permission)
      : [...currentPerms, permission];

    setRolePermissions({
      ...rolePermissions,
      [role]: newPerms,
    });
  };

  // Bật/tắt cả 1 module (ví dụ bật/tắt cả 4 quyền của Đặt sân)
  const handleModuleToggle = (role, mod) => {
    const currentPerms = rolePermissions[role] || [];
    const modKeys = mod.actions.map(a => a.key);
    const hasAll = modKeys.every(k => currentPerms.includes(k));

    let newPerms;
    if (hasAll) {
      // Bỏ toàn bộ quyền của module này
      newPerms = currentPerms.filter(k => !modKeys.includes(k));
    } else {
      // Bật toàn bộ quyền của module này
      const toAdd = modKeys.filter(k => !currentPerms.includes(k));
      newPerms = [...currentPerms, ...toAdd];
    }

    setRolePermissions({
      ...rolePermissions,
      [role]: newPerms,
    });
  };

  // Chọn tất cả hoặc Xóa hết quyền của 1 vai trò
  const handleBulkToggle = (role, selectAll) => {
    setRolePermissions({
      ...rolePermissions,
      [role]: selectAll ? [...ALL_PERMISSION_KEYS] : [],
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      localStorage.setItem('rolePermissions', JSON.stringify(rolePermissions));
      await updateRolePermissions(rolePermissions);
      toast.success('Lưu phân quyền CRUD thành công vào cơ sở dữ liệu!');
    } catch (err) {
      console.error(err);
      toast.success('Đã lưu phân quyền trên trình duyệt');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn đặt lại toàn bộ phân quyền về chuẩn mặc định?')) return;
    try {
      setRolePermissions(DEFAULT_PERMISSIONS);
      localStorage.removeItem('rolePermissions');
      await resetRolePermissions();
      toast.success('Đã đặt lại toàn bộ phân quyền về mặc định');
    } catch (err) {
      setRolePermissions(DEFAULT_PERMISSIONS);
      localStorage.removeItem('rolePermissions');
      toast.success('Đã đặt lại toàn bộ phân quyền về mặc định');
    }
  };

  const userCounts = UserCountByRole({ users });

  const filteredRoles = activeRoleFilter === 'all'
    ? ROLES
    : ROLES.filter(r => r.value === activeRoleFilter);

  return (
    <div className="user-roles-page">
      <AdminSidebar />
      <div className="main-content users-admin-main">
        <TopHeader />
        <div className="content-inner">
          <div className="page-header">
            <div>
              <span className="users-page-eyebrow">
                NGƯỜI DÙNG <span>/</span> PHÂN QUYỀN CRUD CHI TIẾT
              </span>
              <h2>Phân quyền hệ thống</h2>
              <p>Cấu hình quyền Tạo (C), Xem (R), Sửa (U), Xóa/Hủy (D) riêng biệt cho từng vai trò</p>
            </div>
            <div className="header-controls">
              <button className="btn-reset" onClick={handleReset}>
                <span className="material-symbols-outlined">refresh</span>
                Đặt lại mặc định
              </button>
              <button className="btn-save" onClick={handleSave} disabled={loading}>
                <span className="material-symbols-outlined">save</span>
                {loading ? 'Đang lưu CSDL...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>

          {/* Role Filter Tabs */}
          <div className="role-filter-tabs">
            <button
              type="button"
              className={`role-tab-btn ${activeRoleFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveRoleFilter('all')}
            >
              <span className="material-symbols-outlined">groups</span>
              Tất cả vai trò ({ROLES.length})
            </button>
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                className={`role-tab-btn ${activeRoleFilter === r.value ? 'active' : ''}`}
                onClick={() => setActiveRoleFilter(r.value)}
              >
                <span className="material-symbols-outlined">{r.icon}</span>
                {r.label}
              </button>
            ))}
          </div>

          {/* Roles Grid */}
          <div className="roles-grid">
            {filteredRoles.map((role) => (
              <RoleCard
                key={role.value}
                role={role}
                permissions={rolePermissions[role.value] || []}
                onPermissionToggle={handlePermissionToggle}
                onModuleToggle={handleModuleToggle}
                onBulkToggle={handleBulkToggle}
                userCount={userCounts[role.value]}
              />
            ))}
          </div>

          {/* Info Card */}
          <div className="info-card">
            <div className="info-icon">
              <span className="material-symbols-outlined">security</span>
            </div>
            <div className="info-content">
              <h4>Giải thích quyền CRUD trong cụm sân bóng đá (Hải Châu)</h4>
              <p>
                • <strong>Xem (R - Read):</strong> Quyền xem danh sách, chi tiết lịch đặt sân, khung giờ hoặc giá dịch vụ.<br />
                • <strong>Tạo (C - Create):</strong> Quyền thêm mới (ví dụ: tạo đơn đặt sân mới tại quầy, thêm sân, thêm đồ uống).<br />
                • <strong>Sửa (U - Update):</strong> Quyền chỉnh sửa thông tin (đổi giờ đặt, check-in nhận sân, sửa giá, khóa tài khoản).<br />
                • <strong>Xóa / Hủy (D - Delete):</strong> Quyền xóa hoặc hủy đơn. <em>Khuyến nghị: Chỉ cấp cho Chủ sân và Quản lý sân để chống thất thoát tiền bạc và gian lận ca trực.</em><br />
                • <strong>Quản trị viên (Super Admin):</strong> Luôn có toàn quyền quản trị tối cao trên toàn hệ thống.
              </p>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} onRemove={removeToast} />
    </div>
  );
}
