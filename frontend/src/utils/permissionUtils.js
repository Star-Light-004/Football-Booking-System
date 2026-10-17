// ─── Permission Management Utility ──────────────────────────────────────────

export const DEFAULT_PERMISSIONS = {
  customer: [
    'bookings_view', 'bookings_create',
  ],
  field_owner: [
    'dashboard_view',
    'fields_view', 'fields_create', 'fields_edit', 'fields_delete',
    'bookings_view', 'bookings_create', 'bookings_edit', 'bookings_cancel',
    'timeslots_view', 'timeslots_create', 'timeslots_edit', 'timeslots_delete',
    'services_view', 'services_create', 'services_edit', 'services_delete',
    'vouchers_view', 'vouchers_create', 'vouchers_edit', 'vouchers_delete',
    'users_view', 'users_create', 'users_edit',
    'revenue_view', 'revenue_export',
    'maintenance_manage', 'cleaning_manage',
    'settings_manage',
  ],
  field_manager: [
    'dashboard_view',
    'fields_view', 'fields_edit',
    'bookings_view', 'bookings_create', 'bookings_edit', 'bookings_cancel',
    'timeslots_view', 'timeslots_create', 'timeslots_edit',
    'services_view', 'services_create', 'services_edit',
    'vouchers_view', 'vouchers_create', 'vouchers_edit',
    'users_view',
    'maintenance_manage', 'cleaning_manage',
  ],
  receptionist: [
    'dashboard_view',
    'fields_view',
    'bookings_view', 'bookings_create', 'bookings_edit',
    'timeslots_view',
    'services_view',
    'vouchers_view',
  ],
  cashier: [
    'dashboard_view',
    'bookings_view', 'bookings_edit',
    'revenue_view', 'revenue_export',
    'services_view',
    'vouchers_view',
  ],
  cleaner: [
    'cleaning_manage',
  ],
  service_staff: [
    'dashboard_view',
    'services_view', 'services_create', 'services_edit',
  ],
  maintenance: [
    'dashboard_view',
    'fields_view',
    'maintenance_manage',
  ],
  admin: [
    'dashboard_view',
    'fields_view', 'fields_create', 'fields_edit', 'fields_delete',
    'bookings_view', 'bookings_create', 'bookings_edit', 'bookings_cancel',
    'timeslots_view', 'timeslots_create', 'timeslots_edit', 'timeslots_delete',
    'services_view', 'services_create', 'services_edit', 'services_delete',
    'vouchers_view', 'vouchers_create', 'vouchers_edit', 'vouchers_delete',
    'users_view', 'users_create', 'users_edit', 'users_delete',
    'revenue_view', 'revenue_export',
    'maintenance_manage', 'cleaning_manage',
    'settings_manage',
  ],
};

export const ALL_PERMISSION_KEYS = [
  // Bookings
  'bookings_view', 'bookings_create', 'bookings_edit', 'bookings_cancel',
  // Fields
  'fields_view', 'fields_create', 'fields_edit', 'fields_delete',
  // Timeslots
  'timeslots_view', 'timeslots_create', 'timeslots_edit', 'timeslots_delete',
  // Services
  'services_view', 'services_create', 'services_edit', 'services_delete',
  // Vouchers
  'vouchers_view', 'vouchers_create', 'vouchers_edit', 'vouchers_delete',
  // Users
  'users_view', 'users_create', 'users_edit', 'users_delete',
  // Revenue
  'revenue_view', 'revenue_export',
  // Operations
  'maintenance_manage', 'cleaning_manage',
  // System
  'dashboard_view', 'settings_manage',
];

/**
 * Lấy thông tin user hiện tại từ localStorage.
 * Ưu tiên "admin_user" (session trang quản trị) trước, fallback về "user".
 */
export const getCurrentUser = () => {
  try {
    const adminRaw = localStorage.getItem("admin_user");
    if (adminRaw) return JSON.parse(adminRaw);
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Lấy danh sách quyền của user
 */
export const getUserPermissions = (user = null) => {
  const currentUser = user || getCurrentUser();
  if (!currentUser) return [];

  // Super Admin luôn có toàn quyền
  if (currentUser.role === 'admin') {
    return ALL_PERMISSION_KEYS;
  }

  // 1. Kiểm tra permissions lưu trực tiếp trong user session
  if (Array.isArray(currentUser.permissions) && currentUser.permissions.length > 0) {
    return currentUser.permissions;
  }

  // 2. Tra cứu ma trận quyền trong localStorage
  try {
    const storedMatrix = localStorage.getItem("rolePermissions");
    if (storedMatrix) {
      const matrix = JSON.parse(storedMatrix);
      if (matrix && Array.isArray(matrix[currentUser.role])) {
        return matrix[currentUser.role];
      }
    }
  } catch {
    // fallback
  }

  // 3. Fallback về mặc định
  return DEFAULT_PERMISSIONS[currentUser.role] || [];
};

/**
 * Kiểm tra user hiện tại có quyền cụ thể hay không (hỗ trợ cả module và CRUD action)
 */
export const hasPermission = (permissionKey, user = null) => {
  const currentUser = user || getCurrentUser();
  if (currentUser?.role === 'admin') return true;

  const perms = getUserPermissions(user);
  if (!Array.isArray(perms)) return false;

  // 1. Khớp chính xác
  if (perms.includes(permissionKey)) return true;

  // 2. Kiểm tra truy cập module (Ví dụ: kiểm tra 'bookings' -> cho phép nếu có bất kỳ quyền bookings_* nào)
  const modulePrefixMap = {
    dashboard: ['dashboard', 'dashboard_view'],
    fields: ['fields', 'fields_view', 'fields_create', 'fields_edit', 'fields_delete'],
    bookings: ['bookings', 'bookings_view', 'bookings_create', 'bookings_edit', 'bookings_cancel'],
    users: ['users', 'users_view', 'users_create', 'users_edit', 'users_delete'],
    revenue: ['revenue', 'revenue_view', 'revenue_export'],
    timeslots: ['timeslots', 'timeslots_view', 'timeslots_create', 'timeslots_edit', 'timeslots_delete'],
    services: ['services', 'services_view', 'services_create', 'services_edit', 'services_delete'],
    vouchers: ['vouchers', 'vouchers_view', 'vouchers_create', 'vouchers_edit', 'vouchers_delete'],
    settings: ['settings', 'settings_manage'],
    maintenance: ['maintenance', 'maintenance_manage'],
    cleaning: ['cleaning', 'cleaning_manage'],
  };

  if (modulePrefixMap[permissionKey]) {
    return perms.some((p) => modulePrefixMap[permissionKey].includes(p));
  }

  // 3. Tương thích ngược: Nếu kiểm tra CRUD con (ví dụ 'bookings_view') mà user có quyền module cha ('bookings')
  for (const [modKey, subKeys] of Object.entries(modulePrefixMap)) {
    if (subKeys.includes(permissionKey) && perms.includes(modKey)) {
      return true;
    }
  }

  return false;
};

/**
 * Lọc danh sách navLinks theo quyền thực tế của user hiện tại
 */
export const filterNavLinksByPermission = (links, user = null) => {
  const currentUser = user || getCurrentUser();
  if (currentUser?.role === 'admin') return links;

  return links.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission, user);
  });
};

